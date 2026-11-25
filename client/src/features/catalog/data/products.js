const heroImage =
  'https://mir-s3-cdn-cf.behance.net/project_modules/hd_webp/2fb9e3249375285.6a06008911d47.png'

const giftImage =
  'https://img.shoplineapp.com/media/image_clips/691d7ff7c46aaf00102334d1/original.jpg?1763540983=&owner_id=5ca6dda99972ff000189e573'

export const products = [
  {
    id: 'madagascar-55',
    origin: 'Madagascar',
    cacao: 55,
    type: 'dark',
    price: 12,
    stock: 8,
    weight: '80 g',
    featuredOrder: 1,
    image: heroImage,
    tag: 'bestSeller',
    en: {
      name: 'Madagascar 55% Dark',
      region: 'Sambirano Valley',
      description:
        'Bright red berry acidity with a smooth cocoa finish, crafted in small batches to preserve the character of Sambirano cacao.',
      features: ['Single-origin cacao', 'Vegan', 'Small-batch roasted'],
    },
    es: {
      name: 'Madagascar 55% Oscuro',
      region: 'Valle de Sambirano',
      description:
        'Acidez brillante de frutos rojos con un final suave de cacao, elaborado en lotes pequeños para conservar el carácter del cacao de Sambirano.',
      features: ['Cacao de origen único', 'Vegano', 'Tostado artesanal'],
    },
  },
  {
    id: 'ecuador-75',
    origin: 'Ecuador',
    cacao: 75,
    type: 'dark',
    price: 13.5,
    stock: 3,
    weight: '80 g',
    featuredOrder: 2,
    image:
      'https://images.unsplash.com/photo-1575377427642-087cf684f29d?auto=format&fit=crop&w=900&q=85',
    tag: 'seasonal',
    en: {
      name: 'Ecuador 75% Dark',
      region: 'Esmeraldas',
      description:
        'Floral cacao with roasted nut notes and a lingering dark-chocolate finish.',
      features: ['Single origin', 'Vegan', 'Seasonal release'],
    },
    es: {
      name: 'Ecuador 75% Oscuro',
      region: 'Esmeraldas',
      description:
        'Cacao floral con notas de frutos secos tostados y un final prolongado de chocolate oscuro.',
      features: ['Origen único', 'Vegano', 'Edición de temporada'],
    },
  },
  {
    id: 'peru-truffles',
    origin: 'Peru',
    cacao: 60,
    type: 'gifts',
    price: 28,
    stock: 5,
    weight: '12 pieces',
    featuredOrder: 3,
    image: giftImage,
    en: {
      name: 'Peru Truffle Collection',
      region: 'Cusco',
      description:
        'A gift-ready collection of smooth cacao truffles inspired by the flavors of Peru.',
      features: ['Assorted truffles', 'Gift ready', 'Hand finished'],
    },
    es: {
      name: 'Colección de Trufas de Perú',
      region: 'Cusco',
      description:
        'Una colección de suaves trufas de cacao, lista para regalar e inspirada en los sabores del Perú.',
      features: ['Trufas surtidas', 'Lista para regalar', 'Acabado artesanal'],
    },
  },
  {
    id: 'mexico-60',
    origin: 'Mexico',
    cacao: 60,
    type: 'milk',
    price: 11.5,
    stock: 0,
    weight: '80 g',
    featuredOrder: 4,
    image:
      'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=900&q=85',
    en: {
      name: 'Mexico 60% Milk',
      region: 'Tabasco',
      description: 'Creamy milk chocolate with caramel notes and a mellow cacao finish.',
      features: ['Single origin', 'Creamy milk', 'Caramel finish'],
    },
    es: {
      name: 'México 60% Leche',
      region: 'Tabasco',
      description: 'Chocolate con leche cremoso, notas de caramelo y un final suave de cacao.',
      features: ['Origen único', 'Leche cremosa', 'Final de caramelo'],
    },
  },
  {
    id: 'peru-85',
    origin: 'Peru',
    cacao: 85,
    type: 'dark',
    price: 15,
    stock: 2,
    weight: '80 g',
    featuredOrder: 5,
    image:
      'https://images.unsplash.com/photo-1575377427642-087cf684f29d?auto=format&fit=crop&w=900&q=85',
    tag: 'seasonal',
    en: {
      name: 'Peru 85% Reserve',
      region: 'San Martín',
      description: 'An intense reserve bar with deep roasted cacao and a clean, balanced finish.',
      features: ['High cacao', 'Vegan', 'Reserve batch'],
    },
    es: {
      name: 'Perú 85% Reserva',
      region: 'San Martín',
      description: 'Una barra intensa con cacao tostado profundo y un final limpio y equilibrado.',
      features: ['Alto contenido de cacao', 'Vegano', 'Lote de reserva'],
    },
  },
  {
    id: 'ecuador-citrus',
    origin: 'Ecuador',
    cacao: 55,
    type: 'gifts',
    price: 22,
    stock: 7,
    weight: '8 pieces',
    featuredOrder: 6,
    image: giftImage,
    en: {
      name: 'Ecuador Citrus Truffles',
      region: 'Esmeraldas',
      description: 'Silky Ecuadorian cacao truffles lifted with bright citrus notes.',
      features: ['Eight pieces', 'Citrus ganache', 'Gift ready'],
    },
    es: {
      name: 'Trufas Cítricas de Ecuador',
      region: 'Esmeraldas',
      description: 'Trufas sedosas de cacao ecuatoriano realzadas con notas cítricas brillantes.',
      features: ['Ocho piezas', 'Ganache cítrica', 'Lista para regalar'],
    },
  },
  {
    id: 'ghana-72',
    origin: 'Ghana',
    cacao: 72,
    type: 'dark',
    price: 14,
    stock: 11,
    weight: '80 g',
    featuredOrder: 7,
    image:
      'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=900&q=85',
    en: {
      name: 'Ghana 72% Roasted',
      region: 'Ashanti',
      description: 'Full-bodied cacao with toasted hazelnut and a rounded, lingering finish.',
      features: ['Direct trade', 'Vegan', 'Roasted nut notes'],
    },
    es: {
      name: 'Ghana 72% Tostado',
      region: 'Ashanti',
      description: 'Cacao con cuerpo, notas de avellana tostada y un final redondo y persistente.',
      features: ['Comercio directo', 'Vegano', 'Notas de frutos secos'],
    },
  },
  {
    id: 'dominican-48',
    origin: 'Dominican Republic',
    cacao: 48,
    type: 'milk',
    price: 12.5,
    stock: 6,
    weight: '80 g',
    featuredOrder: 8,
    image:
      'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=900&q=85',
    en: {
      name: 'Dominican 48% Milk',
      region: 'Duarte',
      description: 'Silky milk chocolate with honeyed cacao and a soft vanilla finish.',
      features: ['Single origin', 'Silky texture', 'Honey and vanilla'],
    },
    es: {
      name: 'Dominicana 48% Leche',
      region: 'Duarte',
      description: 'Chocolate con leche sedoso, cacao con notas de miel y un suave final de vainilla.',
      features: ['Origen único', 'Textura sedosa', 'Miel y vainilla'],
    },
  },
]

export const productOrigins = [...new Set(products.map((product) => product.origin))]

export function getProduct(productId) {
  return products.find((product) => product.id === productId)
}

export function getProductCopy(product, locale) {
  return product?.[locale] || product?.en
}

export function formatPrice(price, locale = 'en') {
  return new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}
