# Character hair, beard and outfit

The 3D character keeps the original model (`public/models/character.enc`), rig and animations
untouched. Small assets layer the customisation on top at runtime
(`src/components/Character/utils/appearance.ts`):

- `public/models/character-hair.glb`: a messy textured quiff. A thin scalp cover plus about 200
  tapered hair clumps, modelled in the head bone's rest frame and exported in the model's bind
  space. Per-clump tone variation is stored as vertex colour. At runtime it is skinned with full
  weight to `spine006`, as the original cap and face are. The cap is hidden only after it loads,
  and the original short side/back hair is tinted to match.
- `public/models/face-beard.webp`: a copy of the face texture with an Italian beard painted in
  (moustache, clean cheek line, strokes that follow the growth direction). Applied to the face
  mesh only.
- `public/models/beard-shell.glb`: the beard area of the face, lifted slightly for jaw and chin
  volume. It uses the beard texture, its edge fades out (mask stored as vertex colour), and it
  stays below the blink shape keys' region so it never needs to follow a morph.
- `public/models/overshirt.glb`: an open overshirt (body, placket and collar) built from the
  original shirt surface with the front opening cut out. At runtime each vertex copies the bone
  weights of the nearest original shirt vertex, so it follows the existing animation. The
  original sweatshirt is recoloured as the inner T-shirt; its cuffs take the overshirt colour.

Each part falls back on its own: without the hair the cap stays, without the beard texture the
original face stays, without the overshirt the original shirt keeps its earlier colour.
Colours (overshirt `#243B5A`, T-shirt `#F4F2ED`, denim, hair tone) are constants in
`appearance.ts`.

## Regenerating

Requires Blender 4.1+ and Python 3 with numpy and Pillow.

```bash
node tools/character/decrypt_model.cjs            # writes the decrypted model to tools/character/model/
blender --background --factory-startup --python tools/character/build_character_v3.py -- \
  tools/character/model/character.glb tools/character/v3 render
python tools/character/paint_beard_v3.py <face texture> tools/character/v3/beard_uv.json \
  tools/character/v3/face-beard.webp
```

`build_character_v3.py` writes the three `.glb` files and `beard_uv.json`, plus preview renders
with `render`. The face texture (`head-skin-color3`) can be exported from the decrypted GLB with
any glTF tool. Copy the results into `public/models/`.

`build_hair_beard.py` and `paint_beard.py` are the previous version (smooth hair dome and short
painted beard), kept for reference.
