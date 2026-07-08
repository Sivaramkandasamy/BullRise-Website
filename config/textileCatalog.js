const leaf = (...values) => values.reduce((tree, value) => ({ ...tree, [value]: null }), {});

const textileCategoryTree = {
  MEN: {
    Shirt: {
      'Full Sleeve': leaf('Plain', 'Checked', 'Printed', 'Striped', 'Denim', 'Party Wear', 'Casual', 'Formal'),
      'Half Sleeve': leaf('Plain', 'Checked', 'Printed', 'Striped', 'Denim', 'Party Wear', 'Casual', 'Formal')
    },
    'T-Shirt': leaf('Round Neck', 'Polo', 'V Neck', 'Oversized', 'Printed', 'Plain', 'Collar', 'Sports'),
    Pant: leaf('Formal Pant', 'Casual Pant', 'Chino', 'Cotton Pant', 'Stretch Pant', 'Cargo Pant'),
    Jeans: leaf('Slim Fit', 'Regular Fit', 'Skinny', 'Straight Fit', 'Relaxed Fit'),
    Trouser: leaf('Office', 'Casual', 'Stretch', 'Cotton'),
    Shorts: null,
    Jacket: null,
    Hoodie: null,
    Blazer: null,
    Innerwear: null,
    Socks: null,
    Vest: null,
    'Night Wear': null
  },
  WOMEN: {
    Saree: leaf('Cotton', 'Silk', 'Linen', 'Fancy', 'Designer'),
    Kurti: leaf('Cotton', 'Rayon', 'Printed', 'Embroidery', 'Party Wear'),
    'Churidar Set': null,
    Salwar: null,
    Leggings: null,
    Palazzo: null,
    Tops: leaf('Casual', 'Printed', 'Formal', 'Party Wear'),
    'T-Shirt': null,
    Jeans: null,
    Pant: null,
    Skirt: null,
    Gown: null,
    Nighty: null,
    Jacket: null,
    Dupatta: null,
    Innerwear: null,
    Shawl: null
  },
  KIDS: {
    Boys: leaf('Shirt', 'T-Shirt', 'Jeans', 'Pant', 'Shorts', 'Track Pant', 'Hoodie', 'Innerwear'),
    Girls: leaf('Frock', 'Top', 'Leggings', 'Skirt', 'Jeans', 'T-Shirt', 'Gown', 'Innerwear'),
    Baby: leaf('Romper', 'Jabla', 'Night Suit', 'T-Shirt', 'Pant', 'Cap', 'Socks')
  }
};

const materials = [
  'Cotton', 'Linen', 'Rayon', 'Polyester', 'Poly Cotton', 'Denim',
  'Lycra', 'Viscose', 'Silk', 'Wool', 'Satin', 'Blended Fabric'
];

const colors = [
  'Black', 'White', 'Blue', 'Navy Blue', 'Sky Blue', 'Grey', 'Dark Grey',
  'Brown', 'Coffee', 'Green', 'Olive', 'Maroon', 'Wine', 'Red', 'Pink',
  'Purple', 'Yellow', 'Orange', 'Cream', 'Beige'
];

const sizeRules = {
  MEN_TOP: ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
  MEN_BOTTOM: ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46'],
  WOMEN_ALPHA: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  WOMEN_NUMERIC: ['28', '30', '32', '34', '36', '38', '40', '42'],
  KIDS: ['0-3M', '3-6M', '6-12M', '1Y', '2Y', '3Y', '4Y', '5Y', '6Y', '7Y', '8Y', '9Y', '10Y', '11Y', '12Y', '13Y', '14Y', '15Y', '16Y']
};

const explicitCodes = {
  'T-Shirt': 'TSHIRT',
  'Full Sleeve': 'FS',
  'Half Sleeve': 'HS',
  'Party Wear': 'PTY',
  'Round Neck': 'RND',
  'V Neck': 'VN',
  Oversized: 'OVS',
  Plain: 'PLN',
  Checked: 'CHK',
  Printed: 'PRT',
  Striped: 'STR',
  Embroidery: 'EMB',
  Cotton: 'COT',
  Linen: 'LIN',
  Rayon: 'RAY',
  Polyester: 'POL',
  'Poly Cotton': 'PC',
  Denim: 'DEN',
  Lycra: 'LYC',
  Viscose: 'VIS',
  Silk: 'SLK',
  Wool: 'WOL',
  Satin: 'SAT',
  'Blended Fabric': 'BLD',
  Black: 'BLK',
  White: 'WHT',
  Blue: 'BLU',
  'Navy Blue': 'NVY',
  'Sky Blue': 'SKY',
  Grey: 'GRY',
  'Dark Grey': 'DGY',
  Brown: 'BRN',
  Coffee: 'COF',
  Green: 'GRN',
  Olive: 'OLV',
  Maroon: 'MRN',
  Wine: 'WIN',
  Red: 'RED',
  Pink: 'PNK',
  Purple: 'PUR',
  Yellow: 'YLW',
  Orange: 'ORG',
  Cream: 'CRM',
  Beige: 'BEI'
};

const codeFor = (value, fallbackLength = 4) => {
  if (!value) return '';
  if (explicitCodes[value]) return explicitCodes[value];
  return String(value).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, fallbackLength);
};

const getSizeOptions = ({ category, subCategory, productType }) => {
  if (category === 'KIDS') return sizeRules.KIDS;
  if (category === 'WOMEN') {
    const numericTypes = ['Jeans', 'Pant', 'Leggings', 'Palazzo', 'Skirt'];
    return numericTypes.includes(subCategory) || numericTypes.includes(productType)
      ? sizeRules.WOMEN_NUMERIC
      : sizeRules.WOMEN_ALPHA;
  }

  const bottomTypes = ['Pant', 'Jeans', 'Trouser'];
  return bottomTypes.includes(subCategory) ? sizeRules.MEN_BOTTOM : sizeRules.MEN_TOP;
};

module.exports = {
  textileCategoryTree,
  materials,
  colors,
  sizeRules,
  explicitCodes,
  codeFor,
  getSizeOptions
};
