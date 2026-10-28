// Catálogo geográfico de Colombia enfocado en el Departamento del Cesar
// Con coordenadas para centrado automático de mapas agronómicos y trazadores satelitales

export interface MunicipioGeo {
  nombre: string;
  lat: number;
  lng: number;
}

export interface DepartamentoGeo {
  nombre: string;
  lat: number;
  lng: number;
  zoom: number;
  municipios: MunicipioGeo[];
}

export const COLOMBIA_GEO: DepartamentoGeo[] = [
  {
    nombre: 'Cesar',
    lat: 10.4631,
    lng: -73.2532,
    zoom: 12,
    municipios: [
      { nombre: 'Valledupar', lat: 10.4631, lng: -73.2532 },
      { nombre: 'Aguachica', lat: 8.3072, lng: -73.6169 },
      { nombre: 'Agustín Codazzi', lat: 10.0336, lng: -73.2356 },
      { nombre: 'Bosconia', lat: 9.9767, lng: -73.8864 },
      { nombre: 'Curumaní', lat: 9.1994, lng: -73.5358 },
      { nombre: 'El Copey', lat: 10.1500, lng: -73.9500 },
      { nombre: 'El Paso', lat: 9.6583, lng: -73.7500 },
      { nombre: 'Chiriguaná', lat: 9.3622, lng: -73.6025 },
      { nombre: 'Chimichagua', lat: 9.2558, lng: -73.8117 },
      { nombre: 'La Jagua de Ibirico', lat: 9.5619, lng: -73.3347 },
      { nombre: 'La Paz (Robles)', lat: 10.3847, lng: -73.1728 },
      { nombre: 'Manaure Balcón del Cesar', lat: 10.4072, lng: -73.0319 },
      { nombre: 'Pailitas', lat: 8.9583, lng: -73.6278 },
      { nombre: 'Pelaya', lat: 8.6856, lng: -73.6608 },
      { nombre: 'Pueblo Bello', lat: 10.4167, lng: -73.5833 },
      { nombre: 'Río de Oro', lat: 8.2917, lng: -73.3858 },
      { nombre: 'San Alberto', lat: 7.7592, lng: -73.3917 },
      { nombre: 'San Diego', lat: 10.3347, lng: -73.1814 },
      { nombre: 'San Martín', lat: 8.0000, lng: -73.5167 },
      { nombre: 'Tamalameque', lat: 8.8572, lng: -73.8164 },
      { nombre: 'Astrea', lat: 9.5167, lng: -73.9667 },
      { nombre: 'Becerril', lat: 9.7042, lng: -73.2792 },
      { nombre: 'Gamarra', lat: 8.3228, lng: -73.7439 },
      { nombre: 'González', lat: 8.3933, lng: -73.4000 },
      { nombre: 'La Gloria', lat: 8.6186, lng: -73.8058 },
    ],
  },
  {
    nombre: 'La Guajira',
    lat: 11.5444,
    lng: -72.9072,
    zoom: 11,
    municipios: [
      { nombre: 'Riohacha', lat: 11.5444, lng: -72.9072 },
      { nombre: 'San Juan del Cesar', lat: 10.7711, lng: -73.0028 },
      { nombre: 'Fonseca', lat: 10.8872, lng: -72.8528 },
      { nombre: 'Barrancas', lat: 10.9572, lng: -72.7878 },
      { nombre: 'Villanueva', lat: 10.6078, lng: -72.9789 },
      { nombre: 'Maicao', lat: 11.3783, lng: -72.2417 },
      { nombre: 'Urumita', lat: 10.5594, lng: -73.0117 },
      { nombre: 'El Molino', lat: 10.6528, lng: -72.9028 },
      { nombre: 'La Jagua del Pilar', lat: 10.5147, lng: -73.0722 },
      { nombre: 'Distracción', lat: 10.8986, lng: -72.8878 },
      { nombre: 'Albania', lat: 11.1611, lng: -72.5928 },
      { nombre: 'Dibulla', lat: 11.2722, lng: -73.3083 },
      { nombre: 'Manaure', lat: 11.7750, lng: -72.4444 },
      { nombre: 'Uribia', lat: 11.7139, lng: -72.2661 },
    ],
  },
  {
    nombre: 'Magdalena',
    lat: 11.2408,
    lng: -74.1990,
    zoom: 11,
    municipios: [
      { nombre: 'Santa Marta', lat: 11.2408, lng: -74.1990 },
      { nombre: 'Fundación', lat: 10.5208, lng: -74.1858 },
      { nombre: 'Aracataca', lat: 10.5917, lng: -74.1833 },
      { nombre: 'Ciénaga', lat: 11.0069, lng: -74.2497 },
      { nombre: 'Plato', lat: 9.7903, lng: -74.7825 },
      { nombre: 'El Banco', lat: 9.0006, lng: -73.9758 },
      { nombre: 'Zona Bananera', lat: 10.8406, lng: -74.1378 },
      { nombre: 'Pivijay', lat: 10.4611, lng: -74.6158 },
      { nombre: 'Ariguaní (El Difícil)', lat: 9.8394, lng: -74.2417 },
    ],
  },
  {
    nombre: 'Santander',
    lat: 7.1254,
    lng: -73.1198,
    zoom: 11,
    municipios: [
      { nombre: 'Bucaramanga', lat: 7.1254, lng: -73.1198 },
      { nombre: 'Barrancabermeja', lat: 7.0653, lng: -73.8547 },
      { nombre: 'Floridablanca', lat: 7.0622, lng: -73.0864 },
      { nombre: 'Girón', lat: 7.0683, lng: -73.1697 },
      { nombre: 'Piedecuesta', lat: 6.9881, lng: -73.0494 },
      { nombre: 'San Gil', lat: 6.5594, lng: -73.1361 },
      { nombre: 'Sabana de Torres', lat: 7.3917, lng: -73.4958 },
      { nombre: 'Puerto Wilches', lat: 7.3486, lng: -73.9017 },
      { nombre: 'Rionegro', lat: 7.2611, lng: -73.2139 },
      { nombre: 'Lebrija', lat: 7.1167, lng: -73.2167 },
    ],
  },
  {
    nombre: 'Norte de Santander',
    lat: 7.8939,
    lng: -72.5078,
    zoom: 11,
    municipios: [
      { nombre: 'Cúcuta', lat: 7.8939, lng: -72.5078 },
      { nombre: 'Ocaña', lat: 8.2389, lng: -73.3556 },
      { nombre: 'Pamplona', lat: 7.3758, lng: -72.6481 },
      { nombre: 'Villa del Rosario', lat: 7.8339, lng: -72.4742 },
      { nombre: 'Los Patios', lat: 7.8447, lng: -72.5083 },
      { nombre: 'Tibú', lat: 8.6389, lng: -72.7358 },
      { nombre: 'Ábrego', lat: 8.0806, lng: -73.2208 },
      { nombre: 'Convención', lat: 8.4833, lng: -73.3333 },
    ],
  },
  {
    nombre: 'Bolívar',
    lat: 10.3910,
    lng: -75.4794,
    zoom: 11,
    municipios: [
      { nombre: 'Cartagena', lat: 10.3910, lng: -75.4794 },
      { nombre: 'Magangué', lat: 9.2422, lng: -74.7547 },
      { nombre: 'Carmen de Bolívar', lat: 9.7178, lng: -75.1206 },
      { nombre: 'Turbaco', lat: 10.3283, lng: -75.4128 },
      { nombre: 'Arjona', lat: 10.2583, lng: -75.3444 },
      { nombre: 'Mompós', lat: 9.2417, lng: -74.4258 },
      { nombre: 'San Juan Nepomuceno', lat: 9.9514, lng: -75.0817 },
      { nombre: 'Simití', lat: 7.9583, lng: -73.9458 },
    ],
  },
  {
    nombre: 'Atlántico',
    lat: 10.9685,
    lng: -74.7813,
    zoom: 11,
    municipios: [
      { nombre: 'Barranquilla', lat: 10.9685, lng: -74.7813 },
      { nombre: 'Soledad', lat: 10.9184, lng: -74.7644 },
      { nombre: 'Malambo', lat: 10.8594, lng: -74.7739 },
      { nombre: 'Sabanalarga', lat: 10.6333, lng: -74.9167 },
      { nombre: 'Baranoa', lat: 10.7933, lng: -74.9164 },
      { nombre: 'Galapa', lat: 10.8958, lng: -74.8878 },
      { nombre: 'Puerto Colombia', lat: 10.9878, lng: -74.9547 },
      { nombre: 'Palmar de Varela', lat: 10.7408, lng: -74.7547 },
    ],
  },
  {
    nombre: 'Córdoba',
    lat: 8.7479,
    lng: -75.8814,
    zoom: 11,
    municipios: [
      { nombre: 'Montería', lat: 8.7479, lng: -75.8814 },
      { nombre: 'Cereté', lat: 8.8847, lng: -75.7906 },
      { nombre: 'Lorica', lat: 9.2394, lng: -75.8139 },
      { nombre: 'Sahagún', lat: 8.9467, lng: -75.4431 },
      { nombre: 'Planeta Rica', lat: 8.4117, lng: -75.5847 },
      { nombre: 'Montelíbano', lat: 7.9789, lng: -75.4194 },
      { nombre: 'Tierralta', lat: 8.1742, lng: -76.0594 },
    ],
  },
  {
    nombre: 'Sucre',
    lat: 9.3047,
    lng: -75.3978,
    zoom: 11,
    municipios: [
      { nombre: 'Sincelejo', lat: 9.3047, lng: -75.3978 },
      { nombre: 'Corozal', lat: 9.3178, lng: -75.2936 },
      { nombre: 'San Marcos', lat: 8.6639, lng: -75.1328 },
      { nombre: 'San Onofre', lat: 9.7369, lng: -75.5264 },
      { nombre: 'Tolú', lat: 9.5256, lng: -75.5817 },
      { nombre: 'Sampués', lat: 9.1839, lng: -75.3811 },
    ],
  },
  {
    nombre: 'Antioquia',
    lat: 6.2442,
    lng: -75.5812,
    zoom: 11,
    municipios: [
      { nombre: 'Medellín', lat: 6.2442, lng: -75.5812 },
      { nombre: 'Rionegro', lat: 6.1552, lng: -75.3736 },
      { nombre: 'Apartadó', lat: 7.8828, lng: -76.6264 },
      { nombre: 'Caucasia', lat: 7.9864, lng: -75.1953 },
      { nombre: 'Turbo', lat: 8.0933, lng: -76.7289 },
      { nombre: 'Yarumal', lat: 6.9633, lng: -75.4178 },
      { nombre: 'Santa Rosa de Osos', lat: 6.6472, lng: -75.4608 },
      { nombre: 'Necoclí', lat: 8.4247, lng: -76.7869 },
    ],
  },
  {
    nombre: 'Cundinamarca',
    lat: 4.6097,
    lng: -74.0817,
    zoom: 11,
    municipios: [
      { nombre: 'Bogotá D.C.', lat: 4.6097, lng: -74.0817 },
      { nombre: 'Soacha', lat: 4.5806, lng: -74.2186 },
      { nombre: 'Fusagasugá', lat: 4.3411, lng: -74.3644 },
      { nombre: 'Facatativá', lat: 4.8142, lng: -74.3547 },
      { nombre: 'Chía', lat: 4.8617, lng: -74.0567 },
      { nombre: 'Zipaquirá', lat: 5.0256, lng: -74.0044 },
      { nombre: 'Girardot', lat: 4.3039, lng: -74.8058 },
    ],
  },
  {
    nombre: 'Meta',
    lat: 4.1420,
    lng: -73.6266,
    zoom: 11,
    municipios: [
      { nombre: 'Villavicencio', lat: 4.1420, lng: -73.6266 },
      { nombre: 'Acacías', lat: 3.9875, lng: -73.7578 },
      { nombre: 'Granada', lat: 3.5461, lng: -73.7067 },
      { nombre: 'Puerto López', lat: 4.0847, lng: -72.9567 },
      { nombre: 'San Martín', lat: 3.6961, lng: -73.7011 },
      { nombre: 'Puerto Gaitán', lat: 4.3133, lng: -72.0817 },
    ],
  },
  {
    nombre: 'Valle del Cauca',
    lat: 3.4516,
    lng: -76.5320,
    zoom: 11,
    municipios: [
      { nombre: 'Cali', lat: 3.4516, lng: -76.5320 },
      { nombre: 'Palmira', lat: 3.5394, lng: -76.3036 },
      { nombre: 'Buenaventura', lat: 3.8833, lng: -77.0333 },
      { nombre: 'Tuluá', lat: 4.0847, lng: -76.1953 },
      { nombre: 'Cartago', lat: 4.7464, lng: -75.9117 },
      { nombre: 'Buga', lat: 3.9008, lng: -76.2978 },
    ],
  },
  {
    nombre: 'Tolima',
    lat: 4.4389,
    lng: -75.2322,
    zoom: 11,
    municipios: [
      { nombre: 'Ibagué', lat: 4.4389, lng: -75.2322 },
      { nombre: 'Espinal', lat: 4.1492, lng: -74.8847 },
      { nombre: 'Melgar', lat: 4.2047, lng: -74.6408 },
      { nombre: 'Chaparral', lat: 3.7228, lng: -75.5833 },
      { nombre: 'Líbano', lat: 4.9222, lng: -75.0633 },
      { nombre: 'Mariquita', lat: 5.1978, lng: -74.9017 },
    ],
  },
  {
    nombre: 'Huila',
    lat: 2.9273,
    lng: -75.2819,
    zoom: 11,
    municipios: [
      { nombre: 'Neiva', lat: 2.9273, lng: -75.2819 },
      { nombre: 'Pitalito', lat: 1.8533, lng: -76.0506 },
      { nombre: 'Garzón', lat: 2.1961, lng: -75.6278 },
      { nombre: 'La Plata', lat: 2.3894, lng: -75.8917 },
      { nombre: 'Campoalegre', lat: 2.6869, lng: -75.3253 },
    ],
  },
  {
    nombre: 'Boyacá',
    lat: 5.5353,
    lng: -73.3678,
    zoom: 11,
    municipios: [
      { nombre: 'Tunja', lat: 5.5353, lng: -73.3678 },
      { nombre: 'Duitama', lat: 5.8267, lng: -73.0333 },
      { nombre: 'Sogamoso', lat: 5.7144, lng: -72.9339 },
      { nombre: 'Chiquinquirá', lat: 5.6178, lng: -73.8178 },
      { nombre: 'Paipa', lat: 5.7806, lng: -73.1189 },
    ],
  },
  {
    nombre: 'Caldas',
    lat: 5.0689,
    lng: -75.5174,
    zoom: 11,
    municipios: [
      { nombre: 'Manizales', lat: 5.0689, lng: -75.5174 },
      { nombre: 'Chinchiná', lat: 4.9822, lng: -75.6047 },
      { nombre: 'La Dorada', lat: 5.4547, lng: -74.6647 },
      { nombre: 'Villamaría', lat: 5.0447, lng: -75.5147 },
    ],
  },
  {
    nombre: 'Risaralda',
    lat: 4.8133,
    lng: -75.6961,
    zoom: 11,
    municipios: [
      { nombre: 'Pereira', lat: 4.8133, lng: -75.6961 },
      { nombre: 'Dosquebradas', lat: 4.8347, lng: -75.6797 },
      { nombre: 'Santa Rosa de Cabal', lat: 4.8689, lng: -75.6214 },
    ],
  },
  {
    nombre: 'Quindío',
    lat: 4.5339,
    lng: -75.6811,
    zoom: 11,
    municipios: [
      { nombre: 'Armenia', lat: 4.5339, lng: -75.6811 },
      { nombre: 'Calarcá', lat: 4.5294, lng: -75.6417 },
      { nombre: 'Montenegro', lat: 4.5667, lng: -75.7500 },
      { nombre: 'Quimbaya', lat: 4.6222, lng: -75.7639 },
    ],
  },
  {
    nombre: 'Casanare',
    lat: 5.3378,
    lng: -72.3958,
    zoom: 11,
    municipios: [
      { nombre: 'Yopal', lat: 5.3378, lng: -72.3958 },
      { nombre: 'Aguazul', lat: 5.1728, lng: -72.5472 },
      { nombre: 'Villanueva', lat: 4.6111, lng: -72.9306 },
      { nombre: 'Tauramena', lat: 5.0167, lng: -72.7500 },
      { nombre: 'Paz de Ariporo', lat: 5.8806, lng: -71.8917 },
    ],
  },
];

// Busca un departamento por nombre ignorando mayúsculas y tildes
export function findDepartamentoGeo(nombre: string): DepartamentoGeo | undefined {
  if (!nombre) return undefined;
  const n = normalizeText(nombre);
  return COLOMBIA_GEO.find((d) => normalizeText(d.nombre) === n);
}

// Busca un municipio dentro de un departamento
export function findMunicipioGeo(departamento: string, municipio: string): MunicipioGeo | undefined {
  const dep = findDepartamentoGeo(departamento);
  if (!dep || !municipio) return undefined;
  const m = normalizeText(municipio);
  return dep.municipios.find((mun) => normalizeText(mun.nombre) === m);
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
