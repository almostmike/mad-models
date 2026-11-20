"""Convert OpenAI's original GPT-1 (openai-community/openai-gpt) to ONNX
with a key/value cache, using the same inputs and outputs as Transformers.js
GPT-2 exports, so the browser can run it through GPT2LMHeadModel.

GPT-1 differs from GPT-2 only inside each block: layer norm comes *after*
each residual add (post-LN), and there is no final layer norm. The output
head is tied to the token embedding. Everything else (12 layers, 12 heads,
768 wide, learned positions, tanh-approximated GELU) carries over.

Usage:
    python convert.py <dir with model.safetensors etc.> <output dir>

Writes <output dir>/onnx/model.onnx (fp32) and the tokenizer/config files.
Quantize afterwards with quantize.py.
"""

import json
import math
import shutil
import sys
from pathlib import Path

import torch
import torch.nn.functional as F
from safetensors.torch import load_file

N_LAYER, N_HEAD, N_EMBD, N_CTX, VOCAB = 12, 12, 768, 512, 40478
HEAD = N_EMBD // N_HEAD


class GPT1(torch.nn.Module):
    def __init__(self, weights: dict):
        super().__init__()
        # One stored copy of the token embedding, kept transposed [768, vocab]:
        # the input lookup gathers columns and the tied output head multiplies
        # by it directly, so the exporter never stores a second, flipped copy.
        self.tok_t = torch.nn.Parameter(weights["tokens_embed.weight"].t().contiguous(), requires_grad=False)
        self.pos = torch.nn.Parameter(weights["positions_embed.weight"], requires_grad=False)
        self.blocks = torch.nn.ModuleList()
        for i in range(N_LAYER):
            b = torch.nn.Module()
            for name in [
                "attn.c_attn.weight", "attn.c_attn.bias", "attn.c_proj.weight", "attn.c_proj.bias",
                "ln_1.weight", "ln_1.bias", "mlp.c_fc.weight", "mlp.c_fc.bias",
                "mlp.c_proj.weight", "mlp.c_proj.bias", "ln_2.weight", "ln_2.bias",
            ]:
                b.register_parameter(name.replace(".", "_"), torch.nn.Parameter(weights[f"h.{i}.{name}"], requires_grad=False))
            self.blocks.append(b)

    def forward(self, input_ids, attention_mask, position_ids, *past):
        bsz, t = input_ids.shape
        x = self.tok_t[:, input_ids].permute(1, 2, 0) + self.pos[position_ids]
        presents = []
        for i, b in enumerate(self.blocks):
            past_k, past_v = past[2 * i], past[2 * i + 1]
            qkv = x @ b.attn_c_attn_weight + b.attn_c_attn_bias
            q, k, v = qkv.split(N_EMBD, dim=2)
            q = q.view(bsz, t, N_HEAD, HEAD).transpose(1, 2)
            k = torch.cat([past_k, k.view(bsz, t, N_HEAD, HEAD).transpose(1, 2)], dim=2)
            v = torch.cat([past_v, v.view(bsz, t, N_HEAD, HEAD).transpose(1, 2)], dim=2)
            presents += [k, v]

            s = k.shape[2]
            w = (q @ k.transpose(-1, -2)) / math.sqrt(HEAD)
            # causal: query at absolute position (s - t + row) sees keys 0..that position
            rows = torch.arange(t, device=x.device).unsqueeze(1) + (s - t)
            cols = torch.arange(s, device=x.device).unsqueeze(0)
            causal = (cols <= rows).to(w.dtype)
            w = w * causal + -1e4 * (1 - causal)  # as in the original implementation
            w = w + (1.0 - attention_mask[:, None, None, :].to(w.dtype)) * -1e4
            a = torch.softmax(w, dim=-1) @ v
            a = a.transpose(1, 2).reshape(bsz, t, N_EMBD)
            a = a @ b.attn_c_proj_weight + b.attn_c_proj_bias

            n = F.layer_norm(x + a, (N_EMBD,), b.ln_1_weight, b.ln_1_bias, 1e-5)
            # original GPT uses the tanh approximation of GELU
            m = F.gelu(n @ b.mlp_c_fc_weight + b.mlp_c_fc_bias, approximate="tanh")
            m = m @ b.mlp_c_proj_weight + b.mlp_c_proj_bias
            x = F.layer_norm(n + m, (N_EMBD,), b.ln_2_weight, b.ln_2_bias, 1e-5)

        logits = x @ self.tok_t  # tied output head
        return (logits, *presents)


def main(src: Path, out: Path) -> None:
    weights = load_file(str(src / "model.safetensors"))
    model = GPT1(weights).eval()
    (out / "onnx").mkdir(parents=True, exist_ok=True)

    past_len, t = 2, 3
    ids = torch.randint(0, VOCAB, (1, t))
    mask = torch.ones(1, past_len + t, dtype=torch.long)
    pos = torch.arange(past_len, past_len + t).unsqueeze(0)
    past = [torch.zeros(1, N_HEAD, past_len, HEAD) for _ in range(2 * N_LAYER)]

    past_names = [f"past_key_values.{i}.{kv}" for i in range(N_LAYER) for kv in ("key", "value")]
    present_names = [f"present.{i}.{kv}" for i in range(N_LAYER) for kv in ("key", "value")]
    dyn = {
        "input_ids": {0: "batch_size", 1: "sequence_length"},
        "attention_mask": {0: "batch_size", 1: "total_sequence_length"},
        "position_ids": {0: "batch_size", 1: "sequence_length"},
        "logits": {0: "batch_size", 1: "sequence_length"},
    }
    for n in past_names:
        dyn[n] = {0: "batch_size", 2: "past_sequence_length"}
    for n in present_names:
        dyn[n] = {0: "batch_size", 2: "total_sequence_length"}

    torch.onnx.export(
        model,
        (ids, mask, pos, *past),
        str(out / "onnx" / "model.onnx"),
        input_names=["input_ids", "attention_mask", "position_ids", *past_names],
        output_names=["logits", *present_names],
        dynamic_axes=dyn,
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )

    # Config: present it as GPT-2 shaped so Transformers.js uses GPT2LMHeadModel.
    config = {
        "model_type": "gpt2",
        "architectures": ["GPT2LMHeadModel"],
        "n_layer": N_LAYER,
        "n_head": N_HEAD,
        "n_embd": N_EMBD,
        "n_positions": N_CTX,
        "n_ctx": N_CTX,
        "vocab_size": VOCAB,
        "bos_token_id": None,
        "eos_token_id": None,
        "_note": "OpenAI GPT-1 (openai-gpt), post-LN, exported with a GPT-2-compatible ONNX interface. MIT License.",
        "transformers.js_config": {"dtype": "q8"},
    }
    (out / "config.json").write_text(json.dumps(config, indent=2))
    (out / "generation_config.json").write_text(json.dumps({"max_length": N_CTX}, indent=2))
    for f in ["tokenizer.json", "vocab.json", "merges.txt"]:
        shutil.copy(src / f, out / f)
    (out / "tokenizer_config.json").write_text(json.dumps({
        "model_max_length": N_CTX,
        "tokenizer_class": "OpenAIGPTTokenizer",
        "unk_token": "<unk>",
        "do_lower_case": True,
        "clean_up_tokenization_spaces": False,
    }, indent=2))
    print("wrote", out)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
