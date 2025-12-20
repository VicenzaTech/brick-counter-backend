/**
 * Brick Type Seed Data Interface
 */
export interface BrickTypeSeed {
    name: string;
    description?: string | null;
    unit?: string | null;
    specs?: any | null;
    workshop?: string | null;
    productionLine?: string | null;
    tileSize?: string | null;
    contractCycle?: number | null;
    kilnOutput?: number | null;
    qualityProductOutput?: number | null;
    deductionDays?: number | null;
    contractProduction?: number | null;
    additionalContractWhenReducingCycle?: number | null;
    reducedContractWhenIncreasingCycle?: number | null;
    nameEnglish?: string | null;
    thickness?: number | null;
    brickType?: string | null;
    weightPerM2?: number | null;
    piecesPerBox?: number | null;
    m2PerBox?: number | null;
    weightPerBox?: number | null;
    boxesPerPallet?: number | null;
    qualityStandard?: string | null;
    productLineName?: string | null;
    notes?: string | null;
}

/**
 * Brick Types Seed Data - Real Data (48 items from brickTypes_complete.json)
 */
export const newBrickTypes: { brickTypes: BrickTypeSeed[] } = {
    "brickTypes": [
        {
            "name": "Gạch Granite/Porcelain 600x600",
            "nameEnglish": "Granite/Porcelain Tiles",
            "tileSize": "600x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 49,
            "piecesPerBox": 4,
            "m2PerBox": null,
            "weightPerBox": 30,
            "boxesPerPallet": 80,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 600,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain 800x800",
            "nameEnglish": "Granite/Porcelain Tiles",
            "tileSize": "800x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 42,
            "piecesPerBox": 3,
            "m2PerBox": null,
            "weightPerBox": 42,
            "boxesPerPallet": 28,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 800,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain 300x600",
            "nameEnglish": "Granite/Porcelain Tiles",
            "tileSize": "300x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 29,
            "piecesPerBox": 8,
            "m2PerBox": null,
            "weightPerBox": 29,
            "boxesPerPallet": 72,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 300,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain 400x800",
            "nameEnglish": "Granite/Porcelain Tiles",
            "tileSize": "400x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": null,
            "piecesPerBox": 5,
            "m2PerBox": 1,
            "weightPerBox": null,
            "boxesPerPallet": 40,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Porcelain 400x400",
            "nameEnglish": "Full body Porcelain Tiles",
            "tileSize": "400x400",
            "thickness": 9,
            "brickType": "Porcelain",
            "weightPerM2": null,
            "piecesPerBox": 6,
            "m2PerBox": null,
            "weightPerBox": null,
            "boxesPerPallet": 40,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": "KIMSA full body",
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 400,
                "thickness": 9,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Porcelain 500x500",
            "nameEnglish": "Sugar Porcelain Tiles",
            "tileSize": "500x500",
            "thickness": 9,
            "brickType": "Porcelain",
            "weightPerM2": 30,
            "piecesPerBox": 6,
            "m2PerBox": 1,
            "weightPerBox": null,
            "boxesPerPallet": 72,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": "KIMSA full body",
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 9,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Ceramic 500x500",
            "nameEnglish": "Ceramic Tiles",
            "tileSize": "500x500",
            "thickness": 8,
            "brickType": "Ceramic",
            "weightPerM2": 28,
            "piecesPerBox": 6,
            "m2PerBox": 1,
            "weightPerBox": 28,
            "boxesPerPallet": 72,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 8,
                "type": "Ceramic"
            }
        },
        {
            "name": "Gạch Granite 500x500",
            "nameEnglish": "Outdoor Tiles",
            "tileSize": "500x500",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 32,
            "piecesPerBox": 6,
            "m2PerBox": 1,
            "weightPerBox": 32,
            "boxesPerPallet": 72,
            "qualityStandard": "ISO 13006",
            "productLineName": null,
            "notes": "KIMSA full body",
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Porcelain 300x600",
            "nameEnglish": "Matt Full body Porcelain Tiles",
            "tileSize": "300x600",
            "thickness": 12,
            "brickType": "Porcelain",
            "weightPerM2": 29,
            "piecesPerBox": 6,
            "m2PerBox": 1,
            "weightPerBox": 29,
            "boxesPerPallet": 72,
            "qualityStandard": "ISO 13006",
            "productLineName": null,
            "notes": "KIMSA full body",
            "unit": "m2",
            "specs": {
                "width": 300,
                "height": 600,
                "thickness": 12,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Porcelain 400x600",
            "nameEnglish": "Matt Full body Porcelain Tiles",
            "tileSize": "400x600",
            "thickness": 12,
            "brickType": "Porcelain",
            "weightPerM2": 38,
            "piecesPerBox": 6,
            "m2PerBox": null,
            "weightPerBox": 38,
            "boxesPerPallet": 48,
            "qualityStandard": "ISO 13006",
            "productLineName": null,
            "notes": "KIMSA full body",
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 600,
                "thickness": 12,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Porcelain 500x500",
            "nameEnglish": "Matt Full body Porcelain Tiles",
            "tileSize": "500x500",
            "thickness": 12,
            "brickType": "Porcelain",
            "weightPerM2": 33,
            "piecesPerBox": 5,
            "m2PerBox": null,
            "weightPerBox": 33,
            "boxesPerPallet": 72,
            "qualityStandard": "ISO 13006",
            "productLineName": null,
            "notes": "KIMSA full body",
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 12,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Porcelain 600x600",
            "nameEnglish": "Matt Full body Porcelain Tiles",
            "tileSize": "600x600",
            "thickness": 12,
            "brickType": "Porcelain",
            "weightPerM2": 37,
            "piecesPerBox": 4,
            "m2PerBox": null,
            "weightPerBox": 37,
            "boxesPerPallet": 64,
            "qualityStandard": "ISO 13006",
            "productLineName": null,
            "notes": "KIMSA full body",
            "unit": "m2",
            "specs": {
                "width": 600,
                "height": 600,
                "thickness": 12,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Granite 1000x1000",
            "nameEnglish": "Granite Tiles",
            "tileSize": "1000x1000",
            "thickness": 9,
            "brickType": "Granite",
            "weightPerM2": 49,
            "piecesPerBox": 2,
            "m2PerBox": 2,
            "weightPerBox": 49,
            "boxesPerPallet": 40,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 1000,
                "height": 1000,
                "thickness": 9,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Porcelain 150x800",
            "nameEnglish": "Glazed Porcelain Tiles",
            "tileSize": "150x800",
            "thickness": 9,
            "brickType": "Porcelain",
            "weightPerM2": 22,
            "piecesPerBox": 8,
            "m2PerBox": null,
            "weightPerBox": null,
            "boxesPerPallet": 87,
            "qualityStandard": "TCVN 7132:2002",
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 150,
                "height": 800,
                "thickness": 9,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain men matt",
            "nameEnglish": null,
            "tileSize": "600x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 30,
            "piecesPerBox": 4,
            "m2PerBox": 1.44,
            "weightPerBox": null,
            "boxesPerPallet": 80,
            "qualityStandard": null,
            "productLineName": "Gạch Granite/Porcelain men matt",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 600,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain mài bóng",
            "nameEnglish": null,
            "tileSize": "600x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 30,
            "piecesPerBox": 4,
            "m2PerBox": 1.44,
            "weightPerBox": null,
            "boxesPerPallet": 80,
            "qualityStandard": null,
            "productLineName": "Gạch Granite/Porcelain mài bóng",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 600,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite Porcelain 600x600mm matt định hình, KIMSA full body, siêu dày",
            "nameEnglish": null,
            "tileSize": "600x600",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 37,
            "piecesPerBox": 4,
            "m2PerBox": 1.44,
            "weightPerBox": null,
            "boxesPerPallet": 64,
            "qualityStandard": null,
            "productLineName": "Gạch Granite Porcelain 600x600mm matt định hình, KIMSA full body, siêu dày",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 600,
                "height": 600,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Granite/Porcelain men matt",
            "nameEnglish": null,
            "tileSize": "800x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 42,
            "piecesPerBox": 3,
            "m2PerBox": 1.92,
            "weightPerBox": null,
            "boxesPerPallet": 28,
            "qualityStandard": null,
            "productLineName": "Gạch Granite/Porcelain men matt",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 800,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain mài bóng",
            "nameEnglish": null,
            "tileSize": "800x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 42,
            "piecesPerBox": 3,
            "m2PerBox": 1.92,
            "weightPerBox": null,
            "boxesPerPallet": 28,
            "qualityStandard": null,
            "productLineName": "Gạch Granite/Porcelain mài bóng",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 800,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain men matt",
            "nameEnglish": null,
            "tileSize": "300x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 29,
            "piecesPerBox": 8,
            "m2PerBox": 1.44,
            "weightPerBox": null,
            "boxesPerPallet": 72,
            "qualityStandard": null,
            "productLineName": "Gạch Granite/Porcelain men matt",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 300,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain mài bóng",
            "nameEnglish": null,
            "tileSize": "300x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 29,
            "piecesPerBox": 8,
            "m2PerBox": 1.44,
            "weightPerBox": null,
            "boxesPerPallet": 72,
            "qualityStandard": null,
            "productLineName": "Gạch Granite/Porcelain mài bóng",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 300,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite 300x600mm matt định hình, KIMSA full body dày 12mm (6 viên)",
            "nameEnglish": null,
            "tileSize": "300x600",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 29,
            "piecesPerBox": 6,
            "m2PerBox": 1.08,
            "weightPerBox": null,
            "boxesPerPallet": 72,
            "qualityStandard": null,
            "productLineName": "Gạch Granite 300x600mm matt định hình, KIMSA full body dày 12mm (6 viên)",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 300,
                "height": 600,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Granite/Porcelain men matt",
            "nameEnglish": null,
            "tileSize": "400x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 43.5,
            "piecesPerBox": 5,
            "m2PerBox": 1.6,
            "weightPerBox": null,
            "boxesPerPallet": 40,
            "qualityStandard": null,
            "productLineName": "Gạch Granite/Porcelain men matt",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain mài bóng",
            "nameEnglish": null,
            "tileSize": "400x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 43.5,
            "piecesPerBox": 5,
            "m2PerBox": 1.6,
            "weightPerBox": null,
            "boxesPerPallet": 40,
            "qualityStandard": null,
            "productLineName": "Gạch Granite/Porcelain mài bóng",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Ceramic",
            "nameEnglish": null,
            "tileSize": "500x500",
            "thickness": 8,
            "brickType": "Ceramic",
            "weightPerM2": 28,
            "piecesPerBox": 6,
            "m2PerBox": 1.5,
            "weightPerBox": null,
            "boxesPerPallet": 72,
            "qualityStandard": null,
            "productLineName": "Gạch Ceramic",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 8,
                "type": "Ceramic"
            }
        },
        {
            "name": "Gạch Porcelain 500x500mm Sugar KIMSA fullbody (6 viên)",
            "nameEnglish": null,
            "tileSize": "500x500",
            "thickness": 9,
            "brickType": "Porcelain",
            "weightPerM2": 30.5,
            "piecesPerBox": 6,
            "m2PerBox": 1.5,
            "weightPerBox": null,
            "boxesPerPallet": 72,
            "qualityStandard": null,
            "productLineName": "Gạch Porcelain 500x500mm Sugar KIMSA fullbody (6 viên)",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 9,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Granite 500x500mm matt định hình, KIMSA full body (6 viên)",
            "nameEnglish": null,
            "tileSize": "500x500",
            "thickness": 9,
            "brickType": "Granite",
            "weightPerM2": 32,
            "piecesPerBox": 5,
            "m2PerBox": 1.5,
            "weightPerBox": null,
            "boxesPerPallet": 72,
            "qualityStandard": null,
            "productLineName": "Gạch Granite 500x500mm matt định hình, KIMSA full body (6 viên)",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 9,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Granite 500x500mm matt định hình, KIMSA full body, siêu dày (5 viên)",
            "nameEnglish": null,
            "tileSize": "500x500",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 33,
            "piecesPerBox": 5,
            "m2PerBox": 1.25,
            "weightPerBox": null,
            "boxesPerPallet": 72,
            "qualityStandard": null,
            "productLineName": "Gạch Granite 500x500mm matt định hình, KIMSA full body, siêu dày (5 viên)",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Granite 400x600mm matt định hình, KIMSA full body dày 12mm",
            "nameEnglish": null,
            "tileSize": "400x600",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 38,
            "piecesPerBox": 6,
            "m2PerBox": 1.5,
            "weightPerBox": null,
            "boxesPerPallet": 48,
            "qualityStandard": null,
            "productLineName": "Gạch Granite 400x600mm matt định hình, KIMSA full body dày 12mm",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 600,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Porcelain 400x400mm KIMSA fullbody",
            "nameEnglish": null,
            "tileSize": "400x400",
            "thickness": 9,
            "brickType": "Porcelain",
            "weightPerM2": 23,
            "piecesPerBox": 8,
            "m2PerBox": null,
            "weightPerBox": null,
            "boxesPerPallet": 84,
            "qualityStandard": null,
            "productLineName": "Gạch Porcelain 400x400mm KIMSA fullbody",
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 400,
                "thickness": 9,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain men matt",
            "nameEnglish": null,
            "tileSize": "600x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 4,
            "piecesPerBox": 30,
            "m2PerBox": 1.44,
            "weightPerBox": 80,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 600,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain mài bóng",
            "nameEnglish": null,
            "tileSize": "600x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 4,
            "piecesPerBox": 30,
            "m2PerBox": 1.44,
            "weightPerBox": 80,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 600,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite Porcelain 600x600mm matt định hình, KIMSA full body, siêu dày",
            "nameEnglish": null,
            "tileSize": "600x600",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 4,
            "piecesPerBox": 37,
            "m2PerBox": 1.44,
            "weightPerBox": 64,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 600,
                "height": 600,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Granite/Porcelain men matt",
            "nameEnglish": null,
            "tileSize": "800x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 3,
            "piecesPerBox": 42,
            "m2PerBox": 1.92,
            "weightPerBox": 28,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 800,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain mài bóng",
            "nameEnglish": null,
            "tileSize": "800x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 3,
            "piecesPerBox": 42,
            "m2PerBox": 1.92,
            "weightPerBox": 28,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 800,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain men matt",
            "nameEnglish": null,
            "tileSize": "300x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 8,
            "piecesPerBox": 29,
            "m2PerBox": 1.44,
            "weightPerBox": 72,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 300,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain mài bóng",
            "nameEnglish": null,
            "tileSize": "300x600",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 8,
            "piecesPerBox": 29,
            "m2PerBox": 1.44,
            "weightPerBox": 72,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 300,
                "height": 600,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite 300x600mm matt định hình, KIMSA full body dày 12mm (6 viên)",
            "nameEnglish": null,
            "tileSize": "300x600",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 6,
            "piecesPerBox": 29,
            "m2PerBox": 1,
            "weightPerBox": 72,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 300,
                "height": 600,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Granite/Porcelain men matt",
            "nameEnglish": null,
            "tileSize": "400x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 5,
            "piecesPerBox": null,
            "m2PerBox": 1,
            "weightPerBox": 40,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Granite/Porcelain mài bóng",
            "nameEnglish": null,
            "tileSize": "400x800",
            "thickness": 9,
            "brickType": "Granite/Porcelain",
            "weightPerM2": 5,
            "piecesPerBox": null,
            "m2PerBox": 1,
            "weightPerBox": 40,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 800,
                "thickness": 9,
                "type": "Granite/Porcelain"
            }
        },
        {
            "name": "Gạch Ceramic",
            "nameEnglish": null,
            "tileSize": "500x500",
            "thickness": 8,
            "brickType": "Ceramic",
            "weightPerM2": 6,
            "piecesPerBox": 28,
            "m2PerBox": 1,
            "weightPerBox": 72,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 8,
                "type": "Ceramic"
            }
        },
        {
            "name": "Gạch Porcelain 500x500mm Sugar KIMSA fullbody (6 viên)",
            "nameEnglish": null,
            "tileSize": "500x500",
            "thickness": 9,
            "brickType": "Porcelain",
            "weightPerM2": 6,
            "piecesPerBox": null,
            "m2PerBox": 1,
            "weightPerBox": 72,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 9,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Granite 500x500mm matt định hình, KIMSA full body (6 viên)",
            "nameEnglish": null,
            "tileSize": "500x500",
            "thickness": 9,
            "brickType": "Granite",
            "weightPerM2": 5,
            "piecesPerBox": 32,
            "m2PerBox": 1,
            "weightPerBox": 72,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 9,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Granite 500x500mm matt định hình, KIMSA full body, siêu dày (5 viên)",
            "nameEnglish": null,
            "tileSize": "500x500",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 5,
            "piecesPerBox": 33,
            "m2PerBox": 1.25,
            "weightPerBox": 72,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 500,
                "height": 500,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Granite 400x600mm matt định hình, KIMSA full body dày 12mm",
            "nameEnglish": null,
            "tileSize": "400x600",
            "thickness": 12,
            "brickType": "Granite",
            "weightPerM2": 6,
            "piecesPerBox": 38,
            "m2PerBox": 1,
            "weightPerBox": 48,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 600,
                "thickness": 12,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Porcelain 400x400mm KIMSA fullbody",
            "nameEnglish": null,
            "tileSize": "400x400",
            "thickness": 9,
            "brickType": "Porcelain",
            "weightPerM2": 8,
            "piecesPerBox": 23,
            "m2PerBox": 1.28,
            "weightPerBox": 84,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 400,
                "height": 400,
                "thickness": 9,
                "type": "Porcelain"
            }
        },
        {
            "name": "Gạch Granite 1000x1000mm KIMSA full body",
            "nameEnglish": null,
            "tileSize": "1000x1000",
            "thickness": 9,
            "brickType": "Granite",
            "weightPerM2": 2,
            "piecesPerBox": 49,
            "m2PerBox": 2,
            "weightPerBox": 40,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 1000,
                "height": 1000,
                "thickness": 9,
                "type": "Granite"
            }
        },
        {
            "name": "Gạch Semi - Porcelain",
            "nameEnglish": null,
            "tileSize": "150x800",
            "thickness": 9,
            "brickType": "Semi - Porcelain",
            "weightPerM2": 8,
            "piecesPerBox": null,
            "m2PerBox": 0.96,
            "weightPerBox": 87,
            "boxesPerPallet": null,
            "qualityStandard": null,
            "productLineName": null,
            "notes": null,
            "unit": "m2",
            "specs": {
                "width": 150,
                "height": 800,
                "thickness": 9,
                "type": "Semi - Porcelain"
            }
        }
    ]
};

