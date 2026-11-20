"""Next-token agreement and KL divergence of quantized GPT-1 exports vs the
full-precision export.

Usage: python compare_gpt1.py <tokenizer.json> <full model.onnx> <quantized.onnx> [...]
"""
import sys, numpy as np, onnxruntime as ort
from transformers import OpenAIGPTTokenizerFast
tok = OpenAIGPTTokenizerFast(tokenizer_file=sys.argv[1])
FULL = sys.argv[2]
texts = ["The ship sailed slowly across the dark ocean as the captain watched the horizon for any sign of land.",
         "She looked into his eyes and whispered that she had never stopped loving him, not even for a moment.",
         "1. apples 2. bananas 3. oranges 4. grapes 5. pears",
         "The scientists announced that the new machine could translate any language in seconds, but nobody believed them.",
         "Hello, how are you today? I am fine, thank you. What did you do this weekend?"]
sessions = {}
def logits(path, ids):
    s = sessions.setdefault(path, ort.InferenceSession(path, providers=["CPUExecutionProvider"]))
    f = {"input_ids": np.array([ids]), "attention_mask": np.ones((1, len(ids)), dtype=np.int64), "position_ids": np.arange(len(ids))[None]}
    for i in range(12):
        f[f"past_key_values.{i}.key"] = np.zeros((1, 12, 0, 64), np.float32); f[f"past_key_values.{i}.value"] = np.zeros((1, 12, 0, 64), np.float32)
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
