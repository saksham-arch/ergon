// Recolour an OpenMapTiles-schema style (OpenFreeMap "liberty") in the
// vase's palette: parchment land, Aegean water, sage parks, cream streets,
// terracotta buildings standing in 3D, labels in slip-brown.

const set = (map, id, prop, value) => {
  try {
    map.setPaintProperty(id, prop, value)
  } catch {
    // Some layers don't take every property; leave them as they are.
  }
}

export function greekify(map) {
  const layers = map.getStyle().layers
  let hasExtrusion = false
  let firstSymbol = null
  for (const l of layers) {
    const id = l.id
    const sl = l['source-layer'] || ''
    if (l.type === 'symbol' && !firstSymbol) firstSymbol = id
    if (l.type === 'background') set(map, id, 'background-color', '#efe5d3')
    else if (l.type === 'fill') {
      if (/water/.test(id) || sl === 'water') set(map, id, 'fill-color', '#a7bcc4')
      else if (/park|wood|grass|forest|landcover|green|garden|pitch|cemetery/.test(id) || sl === 'park' || sl === 'landcover') {
        set(map, id, 'fill-color', '#cfd2a8')
        set(map, id, 'fill-opacity', 0.75)
      } else if (/building/.test(id) || sl === 'building') set(map, id, 'fill-color', '#e2c9a6')
      else if (/landuse|residential|industrial|commercial|school|hospital|aeroway/.test(id) || sl === 'landuse') {
        set(map, id, 'fill-color', '#eadcc4')
        set(map, id, 'fill-opacity', 0.6)
      }
    } else if (l.type === 'line') {
      if (/water|river|stream|canal/.test(id) || sl === 'waterway') set(map, id, 'line-color', '#97b0ba')
      else if (/rail/.test(id)) set(map, id, 'line-color', '#a8927a')
      else if (/casing|outline/.test(id)) set(map, id, 'line-color', '#d8c3a2')
      else if (/road|street|highway|motorway|trunk|primary|secondary|tertiary|minor|service|path|track|bridge|tunnel/.test(id) || sl === 'transportation') {
        set(map, id, 'line-color', /motorway|trunk|primary/.test(id) ? '#f3dcae' : '#fbf5ea')
      } else if (/boundary|admin/.test(id)) set(map, id, 'line-color', '#b8a58c')
    } else if (l.type === 'fill-extrusion') {
      hasExtrusion = true
      set(map, id, 'fill-extrusion-color', ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10], 0, '#e6c9a3', 30, '#d79a6c', 80, '#c4703f'])
      set(map, id, 'fill-extrusion-opacity', 0.9)
    } else if (l.type === 'symbol') {
      set(map, id, 'text-color', '#5a4434')
      set(map, id, 'text-halo-color', 'rgba(243,234,219,0.95)')
      set(map, id, 'text-halo-width', 1.4)
      set(map, id, 'icon-opacity', 0.55)
    }
  }
  // Buildings in 3D if the style doesn't already raise them.
  if (!hasExtrusion && map.getSource('openmaptiles')) {
    map.addLayer(
      {
        id: 'ergon-buildings-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10], 0, '#e6c9a3', 30, '#d79a6c', 80, '#c4703f'],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.9,
        },
      },
      firstSymbol || undefined,
    )
  }
  // A warm haze at the horizon when the map is tilted.
  try {
    map.setSky?.({ 'sky-color': '#f1e2c8', 'horizon-color': '#efd9b8', 'fog-color': '#efe5d3', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.6 })
  } catch {
    // Older styles or versions without sky: the map is fine without it.
  }
}
