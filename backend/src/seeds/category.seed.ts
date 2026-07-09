import "dotenv/config";
import getSupabaseClient from "../config/supabase.config";

const categories = [
  {
    name: "Beverages",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265027/Beverages_lcunrb.png",
    description: "Drinks, juices, and everyday refreshments.",
    is_active: true,
  },
  {
    name: "Snacks",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265027/Snacks_wxordv.png",
    description: "Chips, biscuits, and quick bites.",
    is_active: true,
  },
  {
    name: "Bakery",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265027/Bakery_xwbrje.png",
    description: "Fresh bread, pastries, and baked goods.",
    is_active: true,
  },
  {
    name: "Baby Care",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265026/Baby_Care_bxxwu0.png",
    description: "Essentials for infants and toddlers.",
    is_active: true,
  },
  {
    name: "Frozen Foods",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265027/Frozen_Foods_wknnin.png",
    description: "Frozen meals and freezer staples.",
    is_active: true,
  },
  {
    name: "Fruits & Vegetables",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265026/Fruits_Vegetables_lnmslm.png",
    description: "Fresh produce for everyday cooking.",
    is_active: true,
  },
  {
    name: "Meat & Seafood",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265026/Meat_Seafood_nhtxen.png",
    description: "Fresh meat, fish, and seafood options.",
    is_active: true,
  },
  {
    name: "Pantry Staples",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265027/Pantry_Staples_ppwolo.png",
    description: "Rice, flour, oil, and pantry basics.",
    is_active: true,
  },
  {
    name: "Personal Care",
    image_url: "https://res.cloudinary.com/dp9vvlndo/image/upload/v1781265026/Personal_Care_osossq.png",
    description: "Daily hygiene and personal grooming items.",
    is_active: true,
  },
];

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const seedCategories = async () => {
  try {
    const supabase = getSupabaseClient();
    console.log("Connected to Supabase");

    await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("Existing categories cleared");

    const categoriesToInsert = categories.map((cat) => ({
      ...cat,
      slug: slugify(cat.name),
    }));

    const { data, error } = await supabase
      .from("categories")
      .insert(categoriesToInsert)
      .select();

    if (error) throw error;
    console.log(`${data?.length || 0} categories seeded successfully`);

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

seedCategories();
