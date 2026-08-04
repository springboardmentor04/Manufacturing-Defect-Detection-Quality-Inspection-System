import { MVTecSample } from '../types';

export const MVTEC_SAMPLES: MVTecSample[] = [
  {
    id: 'sample-metal-nut',
    productName: 'M12 Heavy Hex Nut',
    productCategory: 'metal_nut',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    defaultDefectType: 'Surface Crack',
    description: 'Structural micro-crack along thread roots causing severe stress concentration.',
    expectedSeverity: 'Critical'
  },
  {
    id: 'sample-cable',
    productName: 'Automotive Wire Harness',
    productCategory: 'cable',
    imageUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80',
    defaultDefectType: 'Insulation Cut',
    description: 'Slit in external PVC protective sheath exposing copper conductor threads.',
    expectedSeverity: 'High'
  },
  {
    id: 'sample-tile',
    productName: 'Glazed Ceramic Floor Tile',
    productCategory: 'tile',
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    defaultDefectType: 'Surface Scratch',
    description: 'Light superficial abrasion across corner glaze; cosmetic defect.',
    expectedSeverity: 'Low'
  },
  {
    id: 'sample-pill',
    productName: 'Pharmaceutical Tablet',
    productCategory: 'pill',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    defaultDefectType: 'Discoloration',
    description: 'Uneven pigment spotting on active coating layer requiring quality check.',
    expectedSeverity: 'Medium'
  },
  {
    id: 'sample-transistor',
    productName: 'TO-220 Power MOSFET',
    productCategory: 'transistor',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    defaultDefectType: 'Missing Component',
    description: 'Bent lead pin and missing heat-sink mounting fastener.',
    expectedSeverity: 'Critical'
  },
  {
    id: 'sample-wood',
    productName: 'Engineered Hardwood Panel',
    productCategory: 'wood',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    defaultDefectType: 'Structural Hole',
    description: 'Knot hole void in core veneer exceeding tolerance limits.',
    expectedSeverity: 'High'
  }
];
