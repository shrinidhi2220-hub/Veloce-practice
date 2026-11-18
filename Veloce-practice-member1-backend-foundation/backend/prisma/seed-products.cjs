require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const products = [
    {
        id: "veloce-demo-001",
        name: "Wireless Bluetooth Headphones",
        description: "Wireless headphones with clear sound and comfortable design.",
        category: "Electronics",
        brand: "SoundPro",
        city: "Bengaluru",
        price: 1999,
        wholesalePrice: 1799,
        wholesaleQty: 10,
        stock: 25,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-002",
        name: "Mechanical Gaming Keyboard",
        description: "Mechanical keyboard suitable for gaming and productivity.",
        category: "Electronics",
        brand: "KeyTech",
        city: "Bengaluru",
        price: 2499,
        wholesalePrice: 2199,
        wholesaleQty: 10,
        stock: 18,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-003",
        name: "Smart Fitness Watch",
        description: "Fitness watch with activity and health tracking features.",
        category: "Electronics",
        brand: "FitLife",
        city: "Bengaluru",
        price: 2999,
        wholesalePrice: 2699,
        wholesaleQty: 5,
        stock: 20,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-004",
        name: "Laptop Backpack",
        description: "Daily-use backpack with a dedicated laptop compartment.",
        category: "Fashion",
        brand: "UrbanCarry",
        city: "Bengaluru",
        price: 999,
        stock: 30,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-005",
        name: "Running Sneakers",
        description: "Lightweight sneakers for everyday running and walking.",
        category: "Fashion",
        brand: "ActiveStep",
        city: "Bagalkot",
        price: 1599,
        wholesalePrice: 1399,
        wholesaleQty: 10,
        stock: 15,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-006",
        name: "Adjustable Office Chair",
        description: "Comfortable chair for office and study use.",
        category: "Home",
        brand: "WorkSpace",
        city: "Bengaluru",
        price: 4999,
        stock: 8,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-007",
        name: "LED Desk Lamp",
        description: "Energy-efficient LED lamp for your desk.",
        category: "Home",
        brand: "BrightHome",
        city: "Bagalkot",
        price: 699,
        stock: 40,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-008",
        name: "Insulated Water Bottle",
        description: "Reusable insulated bottle for daily use.",
        category: "Accessories",
        brand: "HydroMax",
        city: "Bengaluru",
        price: 499,
        wholesalePrice: 399,
        wholesaleQty: 10,
        stock: 50,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-009",
        name: "Bluetooth Portable Speaker",
        description: "Compact portable speaker for music and entertainment.",
        category: "Electronics",
        brand: "SoundPro",
        city: "Bagalkot",
        price: 1299,
        stock: 22,
        images: [],
        isActive: true
    },
    {
        id: "veloce-demo-010",
        name: "Yoga Exercise Mat",
        description: "Non-slip exercise mat for yoga and workouts.",
        category: "Sports",
        brand: "FitLife",
        city: "Bengaluru",
        price: 799,
        wholesalePrice: 699,
        wholesaleQty: 10,
        stock: 35,
        images: [],
        isActive: true
    }
];

async function main() {
    try {
        const result = await prisma.product.createMany({
            data: products,
            skipDuplicates: true
        });

        console.log("PRODUCT SEEDING COMPLETED");
        console.log("-------------------------");
        console.log("New products inserted:", result.count);
        console.log("Total products:", await prisma.product.count());
    } catch (error) {
        console.error("PRODUCT SEEDING FAILED:", error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();
