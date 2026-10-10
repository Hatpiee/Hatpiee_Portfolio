# Character hair and beard

The 3D character keeps the original model (`public/models/character.enc`) untouched. Two small
assets layer the customisation on top at runtime (`src/components/Character/utils/appearance.ts`):

- `public/models/character-hair.glb`: the hair top, modelled in the head bone's rest frame and
  exported in the model's bind space. At runtime it is skinned with full weight to `spine006`,
  which is how the original cap and face are weighted. The cap is hidden only after it loads.
- `public/models/face-beard.webp`: a copy of the face texture with a short beard painted in over
  the face mesh's UVs. It is applied to the face mesh only. If it fails to load, the original
  face stays.

Clothing colours, the skin-tone lift and the cap fallback are constants in `appearance.ts`.

## Regenerating

Requires Blender 4.1+ and Python 3 with numpy and Pillow.

```bash
node tools/character/decrypt_model.cjs
blender --background --factory-startup --python tools/character/build_hair_beard.py -- norender
python tools/character/paint_beard.py tools/character/model/head-skin-color3.png \
  tools/character/tier2/beard_uv.json tools/character/tier2/face-beard.webp
```

`build_hair_beard.py` writes `tier2/character-hair.glb` and `tier2/beard_uv.json`. Drop
`-- norender` to also get preview renders. The base face texture (`head-skin-color3`) can be
exported from the decrypted GLB with any glTF tool. Copy the results into `public/models/`.
