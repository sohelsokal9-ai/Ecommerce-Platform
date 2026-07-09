import "dotenv/config";
import getSupabaseClient from "../config/supabase.config";
import { computeSalePrice, generateProductSlug } from "../models/product.model";

const seedProducts = async () => {
  try {
    const supabase = getSupabaseClient();
    console.log("Connected to Supabase");

    await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("Existing products cleared");

    const { data: categories } = await supabase.from("categories").select("id, name").limit(10);
    if (!categories || categories.length === 0) {
      console.error("No categories found. Run category seed first.");
      process.exit(1);
    }

    const getCategoryByName = (name: string) => categories.find((c: any) => c.name === name);

    const products = [
      {
        name: "Fresh Apples",
        description: "Crisp and juicy red apples",
        images: ["https://example.com/apple.jpg"],
        original_price: 4.99,
        discount_percent: 0,
        stock_count: 100,
        unit: "kg",
        is_active: true,
        category_id: getCategoryByName("Fruits & Vegetables")?.id || categories[0].id,
      },
      {
        name: "Organic Bananas",
        description: "Sweet organic bananas",
        images: ["https://example.com/banana.jpg"],
        original_price: 3.49,
        discount_percent: 10,
        discount_label: "10% OFF",
        stock_count: 75,
        unit: "kg",
        is_active: true,
        category_id: getCategoryByName("Fruits & Vegetables")?.id || categories[0].id,
      },
      {
        name: "Whole Wheat Bread",
        description: "Freshly baked whole wheat bread",
        images: ["https://example.com/bread.jpg"],
        original_price: 2.99,
        discount_percent: 0,
        stock_count: 50,
        unit: "pc",
        is_active: true,
        category_id: getCategoryByName("Bakery")?.id || categories[0].id,
      },
      {
        name: "Orange Juice",
        description: "Fresh squeezed orange juice",
        images: ["https://example.com/juice.jpg"],
        original_price: 5.99,
        discount_percent: 15,
        discount_label: "15% OFF",
        stock_count: 30,
        unit: "pc",
        is_active: false,
        category_id: getCategoryByName("Beverages")?.id || categories[0].id,
      },
    ];

    const productsToInsert = products.map((p) => ({
      ...p,
      slug: generateProductSlug(p.name),
      sale_price: computeSalePrice(p.original_price, p.discount_percent),
      user_id: "00000000-0000-0000-0000-000000000000",
    }));

    const { data, error } = await supabase
      .from("products")
      .insert(productsToInsert)
      .select();

    if (error) throw error;
    console.log(`${data?.length || 0} products seeded successfully`);

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

seedProducts();
