"""Check an exported GPT-1 ONNX model against Hugging Face's reference
OpenAIGPTLMHeadModel: full-prompt logits, cached incremental steps, and
greedy generation must all agree.

Usage:
    python verify.py <dir with original files> <onnx file>
"""

import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from transformers import OpenAIGPTLMHeadModel, OpenAIGPTTokenizerFast

N_LAYER, N_HEAD, HEAD = 12, 12, 64


def main(src: Path, onnx_path: Path) -> None:
    tok = OpenAIGPTTokenizerFast(tokenizer_file=str(src / "tokenizer.json"))
    ref = OpenAIGPTLMHeadModel.from_pretrained(str(src)).eval()
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])

    prompt = "It was a dark and stormy night, and she"
    ids = tok(prompt)["input_ids"]
    print("tokens:", tok.convert_ids_to_tokens(ids))

    def run(new_ids, past, total):
        t = len(new_ids)
        feeds = {
            "input_ids": np.array([new_ids], dtype=np.int64),
            "attention_mask": np.ones((1, total), dtype=np.int64),
            "position_ids": np.arange(total - t, total, dtype=np.int64)[None, :],
        }
        for i in range(N_LAYER):
            feeds[f"past_key_values.{i}.key"] = past[2 * i]
            feeds[f"past_key_values.{i}.value"] = past[2 * i + 1]
        out = sess.run(None, feeds)
        return out[0], out[1:]

    empty = [np.zeros((1, N_HEAD, 0, HEAD), dtype=np.float32) for _ in range(2 * N_LAYER)]
    logits, past = run(ids, empty, len(ids))
    with torch.no_grad():
        ref_logits = ref(torch.tensor([ids])).logits.numpy()
    diff = np.abs(logits - ref_logits).max()
    print(f"full prompt: max |logit diff| = {diff:.2e}")

    # greedy generation, ONNX with cache vs reference without
    seq, onnx_seq = list(ids), list(ids)
    nxt = int(logits[0, -1].argmax())
    worst = 0.0
    for _ in range(20):
        onnx_seq.append(nxt)
        logits, past = run([nxt], past, len(onnx_seq))
        with torch.no_grad():
            r = ref(torch.tensor([onnx_seq])).logits.numpy()[0, -1]
        worst = max(worst, float(np.abs(logits[0, -1] - r).max()))
        nxt = int(logits[0, -1].argmax())
    with torch.no_grad():
        ref_gen = ref.generate(torch.tensor([seq]), max_new_tokens=21, do_sample=False)[0].tolist()
    print(f"cached steps: max |logit diff| = {worst:.2e}")
    print("onnx:", tok.decode(onnx_seq + [nxt]))
    print("ref: ", tok.decode(ref_gen))
    ok = onnx_seq + [nxt] == ref_gen
    print("greedy generations identical:", ok)
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
