type Attr = { key: string; labelFr: string; labelEn: string; type: "select" | "text" | "number"; options?: string[] };
const size: Attr = { key: "taille", labelFr: "Taille", labelEn: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] };
const color: Attr = { key: "couleur", labelFr: "Couleur", labelEn: "Color", type: "text" };
const brand: Attr = { key: "marque", labelFr: "Marque", labelEn: "Brand", type: "text" };
const condition: Attr = { key: "etat", labelFr: "État", labelEn: "Condition", type: "select", options: ["Neuf", "Comme neuf", "Occasion"] };

export const CATEGORIES: { slug: string; nameFr: string; nameEn: string; icon: string; attributes?: Attr[]; children?: [string, string, string][] }[] = [
  { slug: "mode-vetements", nameFr: "Mode et vêtements", nameEn: "Fashion & clothing", icon: "shirt", attributes: [size, color, brand],
    children: [["mode-femme", "Femme", "Women"], ["mode-homme", "Homme", "Men"], ["pagne-wax", "Pagne & wax", "Wax prints"], ["tenues-traditionnelles", "Tenues traditionnelles", "Traditional wear"]] },
  { slug: "telephones-accessoires", nameFr: "Téléphones et accessoires", nameEn: "Phones & accessories", icon: "smartphone", attributes: [brand, condition, { key: "stockage", labelFr: "Stockage", labelEn: "Storage", type: "select", options: ["32 Go", "64 Go", "128 Go", "256 Go", "512 Go"] }],
    children: [["smartphones", "Smartphones", "Smartphones"], ["accessoires-telephone", "Accessoires", "Accessories"]] },
  { slug: "informatique", nameFr: "Informatique", nameEn: "Computers", icon: "laptop", attributes: [brand, condition], children: [["ordinateurs", "Ordinateurs", "Computers"], ["imprimantes", "Imprimantes", "Printers"]] },
  { slug: "electronique", nameFr: "Électronique", nameEn: "Electronics", icon: "tv", attributes: [brand, condition], children: [["tv-audio", "TV & audio", "TV & audio"]] },
  { slug: "beaute-cosmetiques", nameFr: "Beauté et cosmétiques", nameEn: "Beauty & cosmetics", icon: "sparkles", attributes: [brand],
    children: [["soins-peau", "Soins de la peau", "Skincare"], ["cheveux-meches", "Cheveux, mèches & perruques", "Hair & wigs"], ["parfums", "Parfums", "Fragrances"]] },
  { slug: "bijoux-montres", nameFr: "Bijoux et montres", nameEn: "Jewelry & watches", icon: "gem", attributes: [{ key: "matiere", labelFr: "Matière", labelEn: "Material", type: "text" }] },
  { slug: "chaussures", nameFr: "Chaussures", nameEn: "Shoes", icon: "footprints", attributes: [{ key: "pointure", labelFr: "Pointure", labelEn: "Size", type: "select", options: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"] }, color] },
  { slug: "maison-decoration", nameFr: "Maison et décoration", nameEn: "Home & decor", icon: "lamp" },
  { slug: "electromenager", nameFr: "Électroménager", nameEn: "Home appliances", icon: "refrigerator", attributes: [brand, condition] },
  { slug: "automobile-pieces", nameFr: "Automobile et pièces détachées", nameEn: "Cars & spare parts", icon: "car", attributes: [brand, { key: "annee", labelFr: "Année", labelEn: "Year", type: "number" }, condition],
    children: [["vehicules", "Véhicules", "Vehicles"], ["motos", "Motos", "Motorbikes"], ["pieces-detachees", "Pièces détachées", "Spare parts"]] },
  { slug: "mobilier", nameFr: "Mobilier", nameEn: "Furniture", icon: "sofa" },
  { slug: "agriculture-elevage", nameFr: "Agriculture et élevage", nameEn: "Agriculture & livestock", icon: "sprout" },
  { slug: "alimentation", nameFr: "Alimentation", nameEn: "Food", icon: "wheat", children: [["produits-locaux", "Produits locaux", "Local produce"], ["boissons", "Boissons", "Drinks"]] },
  { slug: "artisanat-africain", nameFr: "Artisanat africain", nameEn: "African crafts", icon: "palette", children: [["faso-dan-fani", "Faso Dan Fani", "Faso Dan Fani"], ["bronze-sculpture", "Bronze & sculpture", "Bronze & sculpture"], ["vannerie-poterie", "Vannerie & poterie", "Basketry & pottery"]] },
  { slug: "immobilier", nameFr: "Immobilier", nameEn: "Real estate", icon: "building", attributes: [{ key: "transaction", labelFr: "Transaction", labelEn: "Transaction", type: "select", options: ["Vente", "Location"] }, { key: "pieces", labelFr: "Pièces", labelEn: "Rooms", type: "number" }] },
  { slug: "services-professionnels", nameFr: "Services professionnels", nameEn: "Professional services", icon: "briefcase" },
  { slug: "education-formations", nameFr: "Éducation et formations", nameEn: "Education & training", icon: "graduation-cap" },
  { slug: "produits-numeriques", nameFr: "Produits numériques", nameEn: "Digital products", icon: "download" },
  { slug: "bebes-enfants", nameFr: "Bébés et enfants", nameEn: "Babies & kids", icon: "baby" },
  { slug: "sport-loisirs", nameFr: "Sport et loisirs", nameEn: "Sports & leisure", icon: "dumbbell" },
  { slug: "materiel-construction", nameFr: "Matériel de construction", nameEn: "Building materials", icon: "hammer" },
  { slug: "energie-solaire", nameFr: "Énergie solaire", nameEn: "Solar energy", icon: "sun", attributes: [{ key: "puissance", labelFr: "Puissance (W)", labelEn: "Power (W)", type: "number" }, brand] },
];
