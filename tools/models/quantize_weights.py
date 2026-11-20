"""Weight-only 8-bit quantization of the GPT-1 ONNX export.

Every large weight is stored as int8 with one scale per output channel and
expanded back to float32 by a DequantizeLinear node, so the maths runs at
full precision. The download is the same size as dynamic int8 (~117MB), but
the outputs stay much closer to the original model, because activations
are never quantized.

Weights whose names contain any --fp16 pattern are stored as float16 with a
Cast instead (for layers with extreme outliers, e.g. GPT-2's mlp.c_proj).

Usage:
    python quantize_weights.py <model.onnx> <model_quantized.onnx> [--fp16 pattern ...]
"""

import sys

import numpy as np
import onnx
from onnx import helper, numpy_helper


def main(src: str, dst: str, fp16_patterns: list) -> None:
    model = onnx.load(src)
    graph = model.graph
    inits = {i.name: i for i in graph.initializer}
    # Weights feeding MatMul/Gather with at least 2 dims and >= 64K values.
    # "Merged" decoders (GPT-2) use them inside If-branch subgraphs, which
    # can read the outer graph's values, so search those too.
    # weight name -> axis holding the output channels (one scale each)
    targets: dict = {}

    def attr(node, key, default):
        for a in node.attribute:
            if a.name == key:
                return a.i
        return default

    def scan(g):
        for node in g.node:
            if node.op_type in ("MatMul", "Gemm", "Gather"):
                for pos, name in enumerate(node.input):
                    if name in inits and len(inits[name].dims) == 2 and np.prod(inits[name].dims) >= 65536:
                        if node.op_type == "Gather":
                            # Embedding table: one scale per embedding *dimension*
                            # (the narrower axis). GPT-2 has a few "rogue"
                            # dimensions with huge values; per-word scales would
                            # let them crush the precision of every other dimension.
                            dims = list(inits[name].dims)
                            targets[name] = int(np.argmin(dims))
                        elif node.op_type == "Gemm" and pos == 1 and attr(node, "transB", 0):
                            targets.setdefault(name, 0)
                        else:
                            targets.setdefault(name, 1)
            for a in node.attribute:
                if a.type == onnx.AttributeProto.GRAPH:
                    scan(a.g)
                for sub in a.graphs:
                    scan(sub)

    scan(graph)

    new_inits, new_nodes = [], []
    halves = 0
    for name, axis in sorted(targets.items()):
        w = numpy_helper.to_array(inits[name]).astype(np.float32)
        if any(p in name for p in fp16_patterns):
            new_inits.append(numpy_helper.from_array(w.astype(np.float16), f"{name}_fp16"))
            new_nodes.append(helper.make_node("Cast", [f"{name}_fp16"], [name], name=f"cast_{name}", to=onnx.TensorProto.FLOAT))
            graph.initializer.remove(inits[name])
            halves += 1
            continue
        scale = np.abs(w).max(axis=1 - axis) / 127.0  # one scale per channel along `axis`
        scale[scale == 0] = 1.0
        q = np.clip(np.round(w / np.expand_dims(scale, 1 - axis)), -127, 127).astype(np.int8)
        new_inits += [
            numpy_helper.from_array(q, f"{name}_int8"),
            numpy_helper.from_array(scale.astype(np.float32), f"{name}_scale"),
        ]
        new_nodes.append(helper.make_node(
            "DequantizeLinear", [f"{name}_int8", f"{name}_scale"], [name], name=f"dequant_{name}", axis=axis,
        ))
        graph.initializer.remove(inits[name])

    graph.initializer.extend(new_inits)
    nodes = list(graph.node)
    del graph.node[:]
    graph.node.extend(new_nodes + nodes)
    onnx.checker.check_model(model)
    onnx.save(model, dst)
    print(f"quantized {len(targets) - halves} weights to int8, {halves} to float16 -> {dst}")


if __name__ == "__main__":
    args = sys.argv[1:]
    patterns = args[args.index("--fp16") + 1:] if "--fp16" in args else []
    main(args[0], args[1], patterns)
