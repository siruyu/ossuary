// Dummy data for the Mausoleum

export interface ProjectCard {
  id: string;
  name: string;
  tagline: string;
  image: string;
  failureMode: string;
  tags: string[];
  stars: number;
  forks: number;
  conceived: string;
  terminated: string;
}

export const CAUSES_OF_DEATH = [
  "ALL",
  "MARKET_FIT",
  "COMPLEXITY",
  "LACK_OF_FUNDS",
  "TECHNICAL_DEBT",
  "PASSION_FADED",
  "SCOPE_CREEP",
  "TEAM_FRACTURE"
];

export const DUMMY_PROJECTS: ProjectCard[] = [
  {
    id: "nebula-os",
    name: "NEBULA_OS.EXE",
    tagline: '"DECENTRALIZED_OS: FAILED_MISSION_OBJECTIVES. REASON: USER_FRICTION_OVERFLOW."',
    image: "",
    failureMode: "MARKET_FIT",
    tags: ["RUST_1.74", "WASM_CORE", "P2P_MESH"],
    stars: 1200,
    forks: 482,
    conceived: "2021.03.14",
    terminated: "2023.11.22",
  },
  {
    id: "hydra-db",
    name: "HYRA_DB.BIN",
    tagline: '"MULTI-HEAD_CONSENSUS: TIME_TO_VOTE > TIME_TO_WRITE. ARCHIVE_STATUS: LOCKED."',
    image: "",
    failureMode: "COMPLEXITY",
    tags: ["GO_V1.2", "RAFT_PROTOCOL", "DIST_SYS"],
    stars: 840,
    forks: 129,
    conceived: "2020.08.01",
    terminated: "2022.06.15",
  },
  {
    id: "vox-sync",
    name: "VOX_SYNC.API",
    tagline: '"RT_VOICE_TRANS: INSUFFICIENT_CREDITS. CLOUD_BILL_OVERFLOW. MODULES_HARVESTABLE."',
    image: "",
    failureMode: "LACK_OF_FUNDS",
    tags: ["PYTHON_3.11", "PYTORCH_2", "FASTAPI"],
    stars: 2400,
    forks: 912,
    conceived: "2022.01.10",
    terminated: "2024.02.28",
  },
  {
    id: "neural-archive",
    name: "NEURAL.ARC_V4",
    tagline: '"3D_KNOWLEDGE_MAPPING: CRITICAL_MISALIGNMENT_BETWEEN_AMBITION_&_UTILITY."',
    image: "",
    failureMode: "TECHNICAL_DEBT",
    tags: ["WEBGL", "REACT_18", "TS_V4.9"],
    stars: 3100,
    forks: 570,
    conceived: "2021.09.05",
    terminated: "2023.11.22",
  },
  {
    id: "void-engine",
    name: "VOID_ENGINE.9",
    tagline: '"NON-EUCLIDEAN_GEOMETRY_RENDERER: NOBODY_UNDERSTANDS_4D_SPACE."',
    image: "",
    failureMode: "PASSION_FADED",
    tags: ["C++17", "GLSL", "VULKAN"],
    stars: 560,
    forks: 43,
    conceived: "2019.06.20",
    terminated: "2023.04.01",
  },
  {
    id: "socio-crypt",
    name: "SOCIO_CRYPT.NET",
    tagline: '"DEAD_MESSAGE_NFT: GAS_FEE_MAKES_HELLO_WORLD_COST_$140."',
    image: "",
    failureMode: "LACK_OF_FUNDS",
    tags: ["SOLIDITY", "TYPESCRIPT", "HARDHAT"],
    stars: 1870,
    forks: 310,
    conceived: "2021.11.03",
    terminated: "2022.08.17",
  },
];

// Necromancer profile data
export const NEXROMANCER_PROFILE = {
  uid: "0xDEADBEEF_04",
  username: "MALAKAI.VOID",
  title: "ARCH-NECROMANCER",
  level: 88,
  rank: "LEGENDARY NECROMANCER",
  totalBuried: 142,
  lootedResources: 892,
  bio: "ARCHITECT OF DEFUNCT MONOLITHS. SPECIALIST IN MEMORY LEAK PRESERVATION AND DEPRECATED API TAXIDERMY. CONVERTING FAILED LOGIC INTO SPECTRAL ASSETS SINCE 2018.",
  masteryTags: ["RUST_VOID", "GLSL_GHOSTS", "LUL_NECROMANCY", "WEBGL_DECAY"],
  systemInsight: '"80% OF BURIED PROJECTS FAIL DUE TO \'SCOPE CREEP HYPERTROPHY\'. CONSIDER SURGICAL REMOVAL OF NON-ESSENTIAL RITUALS."',
};

export const BURIED_NODES = [
  {
    id: "VOID-ENGINE-9",
    name: "VOID-ENGINE-9",
    failure: "NO_MARKET_FIT",
    description: "EXPERIMENTAL RENDERING PIPELINE FOR NON-EUCLIDEAN GEOMETRY. BURIED AFTER 4,000 HOURS WHEN LEAD DEV REALIZED NOBODY UNDERSTANDS 4D SPACE.",
    tags: ["C++", "GL"],
    nodeRef: "#F4A2",
  },
  {
    id: "SOCIO-CRYPT",
    name: "SOCIO-CRYPT",
    failure: "COMPUTE_COSTS",
    description: "DECENTRALIZED SOCIAL NETWORK WHERE EVERY MESSAGE IS AN NFT. BURIED DUE TO GAS FEES MAKING A 'HELLO WORLD' COST $140.",
    tags: ["SLD", "TS"],
    nodeRef: "#B82X",
  },
  {
    id: "PROJECT-ICARUS",
    name: "PROJECT: ICARUS",
    failure: "DEPRECATED_LIB",
    description: "AUTONOMOUS DRONE FLEET MANAGEMENT USING A LIBRARY THAT WAS DELETED BY THE AUTHOR IN A FIT OF RAGE. UNRECOVERABLE LOGIC.",
    tags: ["PY"],
    nodeRef: "#A001",
  },
];

export const LOOTED_TREASURES = [
  {
    id: "spatial-graph",
    name: "SPATIAL_GRAPH_ENG",
    source: "NEURAL.ARCHIVE_V4",
    tags: ["TS_V4.9"],
    description: "WEBGL_NODE_RENDERER.EXE — 3D spatial mapping module extracted from Neural Archive.",
  },
  {
    id: "auth-zkp",
    name: "AUTH_ZKP_FLOW",
    source: "SOCIO_CRYPT.NET",
    tags: ["RUST_1.7"],
    description: "ZERO_KNOWLEDGE_AUTH.PATTERN — Anonymous verification module from Socio-Crypt.",
  },
  {
    id: "vector-srch",
    name: "VECTOR_SRCH_HK",
    source: "NEBULA_OS.EXE",
    tags: ["REACT_18"],
    description: "LOCAL_INDEXING_HOOK.LIB — Client-side vector search from Nebula OS.",
  },
];
