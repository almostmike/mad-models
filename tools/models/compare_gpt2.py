"""Next-token agreement and KL divergence of quantized GPT-2 exports vs the
full-precision export (handles merged decoders with use_cache_branch).

Usage: python compare_gpt2.py <tokenizer.json> <full model.onnx> <quantized.onnx> [...]
"""
import sys, numpy as np, onnxruntime as ort
from transformers import GPT2TokenizerFast
tok = GPT2TokenizerFast(tokenizer_file=sys.argv[1])
FULL = sys.argv[2]
texts = ["The ship sailed slowly across the dark ocean as the captain watched the horizon for any sign of land.",
         "She looked into his eyes and whispered that she had never stopped loving him, not even for a moment.",
         "Edward looked at Bella across the biology classroom. His eyes were dark and hungry.",
         "The scientists announced that the new machine could translate any language in seconds, but nobody believed them.",
         "TL;DR: The vampire loves the girl, the werewolf loves the girl, and everyone is sad."]
sessions = {}
def logits(name, ids):
    s = sessions.setdefault(name, ort.InferenceSession(name, providers=["CPUExecutionProvider"]))
    f = {}
    for i in s.get_inputs():
        if i.name == "input_ids": f[i.name] = np.array([ids], dtype=np.int64)
        elif i.name == "attention_mask": f[i.name] = np.ones((1, len(ids)), dtype=np.int64)
        elif i.name == "position_ids": f[i.name] = np.arange(len(ids), dtype=np.int64)[None]
        elif i.name == "use_cache_branch": f[i.name] = np.array([False])
        elif i.name.startswith("past_key_values"): f[i.name] = np.zeros((1, 12, 0, 64), np.float32)
    return s.run(["logits"], f)[0][0]
for name in sys.argv[3:]:
    agree = total = 0; kl = []
    for t in texts:
        ids = tok(t)["input_ids"]
        a = logits(FULL, ids); b = logits(name, ids)
        agree += int((a.argmax(-1) == b.argmax(-1)).sum()); total += len(ids)
        pa = np.exp(a - a.max(-1, keepdims=True)); pa /= pa.sum(-1, keepdims=True)
        pb = np.exp(b - b.max(-1, keepdims=True)); pb /= pb.sum(-1, keepdims=True)
        kl.append(float((pa * (np.log(pa + 1e-12) - np.log(pb + 1e-12))).sum(-1).mean()))
    print(f"{name}: top-1 agreement {agree}/{total} = {agree/total:.0%}, mean KL {np.mean(kl):.3f}")
