import { prisma, arrayToTags } from "./db";

async function main() {
  // Create a default user
  const user = await prisma.user.upsert({
    where: { email: "demo@ossuary.dev" },
    update: {},
    create: {
      name: "Malakai Void",
      email: "demo@ossuary.dev",
      image: null,
    },
  });

  console.log("Created/Found user:", user.id);

  // Create necromancer profile
  await prisma.necromancerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      title: "ARCH-NECROMANCER",
      level: 88,
      rank: "LEGENDARY",
      totalBuried: 142,
      lootedResources: 892,
      bio: "ARCHITECT OF DEFUNCT MONOLITHS. SPECIALIST IN MEMORY LEAK PRESERVATION AND DEPRECATED API TAXIDERMY. CONVERTING FAILED LOGIC INTO SPECTRAL ASSETS SINCE 2018.",
      masteryTags: arrayToTags(["RUST_VOID", "GLSL_GHOSTS", "LUL_NECROMANCY", "WEBGL_DECAY"]),
      systemInsight: '"80% OF BURIED PROJECTS FAIL DUE TO \'SCOPE CREEP HYPERTROPHY\'. CONSIDER SURGICAL REMOVAL OF NON-ESSENTIAL RITUALS."',
    },
  });

  console.log("Created necromancer profile");

  // Create buried projects
  const projects = [
    {
      userId: user.id,
      name: "NEBULA_OS.EXE",
      description: '"DECENTRALIZED_OS: FAILED_MISSION_OBJECTIVES. REASON: USER_FRICTION_OVERFLOW."',
      failureMode: "MARKET_FIT",
      tags: arrayToTags(["WEBGL", "REACT_18", "TS_V4.9"]),
      techStack: arrayToTags([]),
      stars: 3100,
      forks: 570,
      lastCommit: "2023-11-22",
      repoUrl: "https://github.com/nebula-os",
      obituary: "Knowledge mapping failed due to critical misalignment between ambition and utility.",
    },
    {
      userId: user.id,
      name: "HYDRA_DB.BIN",
      description: '"MULTI-HEAD_CONSENSUS: TIME_TO_VOTE > TIME_TO_WRITE. ARCHIVE_STATUS: LOCKED."',
      failureMode: "COMPLEXITY",
      tags: arrayToTags(["GO_V1.2", "RAFT_PROTOCOL", "DIST_SYS"]),
      techStack: arrayToTags([]),
      stars: 840,
      forks: 129,
      lastCommit: "2022-06-15",
      repoUrl: "https://github.com/hydra-db",
      obituary: "Consensus was too slow. Writing took longer than voting.",
    },
    {
      userId: user.id,
      name: "VOX_SYNC.API",
      description: '"RT_VOICE_TRANS: INSUFFICIENT_CREDITS. CLOUD_BILL_OVERFLOW. MODULES_HARVESTABLE."',
      failureMode: "LACK_OF_FUNDS",
      tags: arrayToTags(["PYTHON_3.11", "PYTORCH_2", "FASTAPI"]),
      techStack: arrayToTags([]),
      stars: 2400,
      forks: 912,
      lastCommit: "2024-02-28",
      repoUrl: "https://github.com/vox-sync",
      obituary: "Cloud costs exceeded revenue. Every voice message cost $140.",
    },
    {
      userId: user.id,
      name: "VOID_ENGINE.9",
      description: '"NON-EUCLIDEAN_GEOMETRY_RENDERER: NOBODY_UNDERSTANDS_4D_SPACE."',
      failureMode: "PASSION_FADED",
      tags: arrayToTags(["C++17", "GLSL", "VULKAN"]),
      techStack: arrayToTags([]),
      stars: 560,
      forks: 43,
      lastCommit: "2023-04-01",
      repoUrl: "https://github.com/void-engine",
      obituary: "4D space confused users and the lead dev.",
    },
    {
      userId: user.id,
      name: "SOCIO_CRYPT.NET",
      description: '"DEAD_MESSAGE_NFT: GAS_FEE_MAKES_HELLO_WORLD_COST_$140."',
      failureMode: "LACK_OF_FUNDS",
      tags: arrayToTags(["SOLIDITY", "TYPESCRIPT", "HARDHAT"]),
      techStack: arrayToTags([]),
      stars: 1870,
      forks: 310,
      lastCommit: "2022-08-17",
      repoUrl: "https://github.com/socio-crypt",
      obituary: "Every social message was a gas-fee nightmare.",
    },
    {
      userId: user.id,
      name: "PROJECT_ICARUS",
      description: '"AUTONOMOUS DRONE FLEET MANAGEMENT USING A DELETED LIBRARY. UNRECOVERABLE_LOGIC."',
      failureMode: "TECHNICAL_DEBT",
      tags: arrayToTags(["PYTHON"]),
      techStack: arrayToTags([]),
      stars: 200,
      forks: 15,
      lastCommit: "2023-01-10",
      repoUrl: "https://github.com/project-icarus",
      obituary: "Dependency was deleted. All logic is gone.",
    },
  ];

  const createdProjects = [];
  for (const proj of projects) {
    const project = await prisma.buriedProject.create({ data: proj });
    createdProjects.push(project);
    console.log(`Created project: ${proj.name}`);

    // Create a lootable module for each project
    const tagStr = proj.tags || "";
    const firstTag = tagStr.split(",")[0] || "CORE";
    await prisma.lootableModule.create({
      data: {
        buriedProjectId: project.id,
        name: `${proj.name.split(".")[0]}_CORE`,
        source: proj.name.split(".")[0] || proj.name,
        tags: arrayToTags([firstTag]),
        description: `Core module extracted from ${proj.name}.`,
        extractCount: Math.floor(Math.random() * 150),
        downloadCount: Math.floor(Math.random() * 200),
        respects: Math.floor(Math.random() * 1500),
      },
    });
  }

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
