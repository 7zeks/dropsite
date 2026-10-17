# Local dependencies

`three.module.min.js` is Three.js **0.160.1**, distributed under the MIT license
in `three.LICENSE.txt`.

Source: https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.min.js

The Tools Atelier dynamically imports this local module only when its lobby
becomes visible. It does not load the rendering library from a third-party CDN
at runtime. The objects and textures are procedural demonstration artwork;
uploaded files are processed by the existing tools and never passed to the scene.
