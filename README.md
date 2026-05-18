# @openpcb/kicad-parsers

Pure TypeScript parsers for KiCad files. Zero runtime dependencies.

## Exports

```ts
import {
  parseKicadSymbolLib, // .kicad_sym → ParsedKicadSymbol[]
  parseKicadFootprint, // .kicad_mod → ParsedKicadFootprint
  parseSexpr, // raw s-expression tokenizer
} from "@openpcb/kicad-parsers";
```

## Install

```bash
npm install "https://gitpkg.vercel.app/OpenPCB-app/shared/packages/kicad-parsers?v0.1.0"
```
