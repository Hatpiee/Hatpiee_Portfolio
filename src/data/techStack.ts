// Technologies shown on the 3D spheres and in the text list beside them. Each one is
// listed in the owner's technical resume; the textures are Simple Icons marks (CC0).
export const TECH_STACK = [
  { name: "Python", image: "/images/python.webp" },
  { name: "scikit-learn", image: "/images/scikitlearn.webp" },
  { name: "Hugging Face", image: "/images/huggingface.webp" },
  { name: "LangChain", image: "/images/langchain.webp" },
  { name: "FastAPI", image: "/images/fastapi.webp" },
  { name: "PostgreSQL", image: "/images/postgresql.webp" },
  { name: "Next.js", image: "/images/next2.webp" },
  { name: "TypeScript", image: "/images/typescript.webp" },
];

// Grouped skills listed under the spheres. Each item appears in the technical resume,
// the LinkedIn skills list or the code of a listed project; no proficiency levels.
export const SKILL_GROUPS = [
  {
    name: "AI engineering",
    items: [
      "Python",
      "Machine learning",
      "Computer vision",
      "NLP",
      "LLMs",
      "RAG",
      "Prompt engineering",
      "LangChain",
      "scikit-learn",
      "XGBoost",
      "LightGBM",
      "SHAP",
      "Hugging Face",
      "Ollama",
      "ChromaDB",
      "OpenCV",
    ],
  },
  {
    name: "Backend & applications",
    items: [
      "FastAPI",
      "REST APIs",
      "PostgreSQL",
      "SQLAlchemy",
      "Next.js",
      "React",
      "TypeScript",
      "Streamlit",
    ],
  },
  {
    name: "IoT & systems",
    items: ["C/C++", "Embedded systems", "IoT", "Arduino", "ESP-IDF"],
  },
  {
    name: "Tools",
    items: ["Git", "GitHub", "Vercel"],
  },
];
