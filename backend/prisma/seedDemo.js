const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');
const matchingWorker = require('../src/workers/matchingWorker');
const messagingService = require('../src/modules/messaging/messaging.service');

async function main() {
  console.log('========================================================');
  console.log('   COMSATS Lost & Found --- Populating Campus Demo Data');
  console.log('========================================================\n');

  // 1. Fetch categories
  const categories = await prisma.category.findMany();
  const getCat = (slug) => categories.find((c) => c.slug === slug)?.id;

  const phoneCat = getCat('mobile-phone');
  const chargerCat = getCat('laptop-charger');
  const cardCat = getCat('student-id-wallets');
  const keysCat = getCat('keys');
  const docsCat = getCat('documents-notebooks');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Students
  const studentsData = [
    {
      email: 'sp23-bse-011@isbstudent.comsats.edu.pk',
      name: 'Fahad Hussain',
      rollNumber: 'SP23-BSE-011',
      status: 'ACTIVE',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      email: 'fa22-bcs-045@isbstudent.comsats.edu.pk',
      name: 'Ihtisham Ul Haq',
      rollNumber: 'FA22-BCS-045',
      status: 'ACTIVE',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      email: 'sp23-bee-023@isbstudent.comsats.edu.pk',
      name: 'Zainab Ali',
      rollNumber: 'SP23-BEE-023',
      status: 'ACTIVE',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      email: 'fa23-bai-015@isbstudent.comsats.edu.pk',
      name: 'Hamza Tariq',
      rollNumber: 'FA23-BAI-015',
      status: 'ACTIVE',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      email: 'sp22-bba-088@isbstudent.comsats.edu.pk',
      name: 'Sara Khan',
      rollNumber: 'SP22-BBA-088',
      status: 'ACTIVE',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  ];

  const students = {};
  for (const s of studentsData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, rollNumber: s.rollNumber, status: 'ACTIVE' },
      create: s,
    });
    students[s.rollNumber] = user;
    console.log(`✓ Student: ${s.name} (${s.email})`);
  }

  // 3. Create Demo Reports
  const reportsData = [
    // Pair 1: Phone
    {
      userId: students['SP23-BSE-011'].id,
      type: 'LOST',
      categoryId: phoneCat,
      title: 'Lost Samsung Galaxy S23 Ultra in Cafeteria',
      description: 'Lost my Phantom Black Samsung Galaxy S23 Ultra. It has a cracked transparent case and a small scratch on the top corner.',
      incidentLocation: 'Student Cafeteria Ground Floor',
      incidentDate: new Date('2026-11-10T11:00:00Z'),
    },
    {
      userId: students['FA23-BAI-015'].id,
      type: 'FOUND',
      categoryId: phoneCat,
      title: 'Found Black Samsung Galaxy Phone on Table 8',
      description: 'Found a black Samsung smartphone with transparent silicon cover on table 8 in the central cafeteria after lunch.',
      incidentLocation: 'Student Cafeteria',
      incidentDate: new Date('2026-11-10T11:30:00Z'),
    },

    // Pair 2: Charger
    {
      userId: students['FA22-BCS-045'].id,
      type: 'LOST',
      categoryId: chargerCat,
      title: 'Lost Dell 65W USB-C Charger',
      description: 'Forgot my black Dell 65W laptop charger plugged into the extension board in CS Block Lab 2 yesterday.',
      incidentLocation: 'CS Department Lab 2',
      incidentDate: new Date('2026-11-09T16:00:00Z'),
    },
    {
      userId: students['SP23-BEE-023'].id,
      type: 'FOUND',
      categoryId: chargerCat,
      title: 'Found Dell 65W Type-C Laptop Adapter',
      description: 'Found a genuine Dell 65W black USB-C laptop charger in CS Block Lab 2 on desk 6 near the window.',
      incidentLocation: 'CS Block Lab 2',
      incidentDate: new Date('2026-11-09T17:15:00Z'),
    },

    // Pair 3: Student Card
    {
      userId: students['SP22-BBA-088'].id,
      type: 'LOST',
      categoryId: cardCat,
      title: 'Lost COMSATS Student ID Card',
      description: 'Misplaced my official COMSATS University student smart card. Roll number SP22-BBA-088 with blue lanyard.',
      incidentLocation: 'Central Library Steps',
      incidentDate: new Date('2026-11-10T09:00:00Z'),
    },
    {
      userId: students['FA23-BAI-015'].id,
      type: 'FOUND',
      categoryId: cardCat,
      title: 'Found Student ID Card near Library',
      description: 'Found a university student card with blue strap on the stairs outside the central library entrance.',
      incidentLocation: 'Central Library Entrance',
      incidentDate: new Date('2026-11-10T09:45:00Z'),
    },

    // Unmatched Items
    {
      userId: students['SP23-BSE-011'].id,
      type: 'LOST',
      categoryId: keysCat,
      title: 'Lost Honda Bike Keys with Red Lanyard',
      description: 'Lost my Honda 125 bike key attached to a red COMSATS University lanyard near Gate 1 parking area.',
      incidentLocation: 'Gate 1 Student Bike Parking',
      incidentDate: new Date('2026-11-10T08:15:00Z'),
    },
    {
      userId: students['SP23-BEE-023'].id,
      type: 'FOUND',
      categoryId: docsCat,
      title: 'Found Operating Systems Lecture Notebook',
      description: 'Found a black spiral notebook containing handwritten Operating Systems and Computer Networks lecture notes.',
      incidentLocation: 'Academic Block 1 Room 102',
      incidentDate: new Date('2026-11-10T10:10:00Z'),
    },
  ];

  console.log('\n--- Creating Demo Reports & Enqueueing Matching Jobs ---');
  for (const r of reportsData) {
    const created = await prisma.report.create({
      data: {
        ...r,
        status: 'ACTIVE',
      },
    });

    await prisma.matchingJob.create({
      data: {
        sourceReportId: created.id,
        status: 'QUEUED',
      },
    });

    console.log(`✓ [${r.type}] ${r.title}`);
  }

  // 4. Run Matching Worker to process all queued jobs
  console.log('\n--- Processing Background Matching Queue ---');
  let jobsCount = 0;
  while (true) {
    const job = await matchingWorker.processNextJob();
    if (!job) break;
    jobsCount++;
  }
  console.log(`✓ Processed ${jobsCount} background matching jobs.`);

  // 5. Seed Demo Chat Messages
  console.log('\n--- Seeding Initial Demo In-App Conversation ---');
  const demoConv = await messagingService.getOrCreateConversation({
    userId: students['SP23-BSE-011'].id,
    otherUserId: students['FA23-BAI-015'].id,
  });

  await messagingService.sendMessage(
    demoConv.id,
    students['SP23-BSE-011'].id,
    'Salam Hamza! I received an AI match alert that you found a Samsung phone in the cafeteria. Does it have a small scratch on the top corner?'
  );

  await messagingService.sendMessage(
    demoConv.id,
    students['FA23-BAI-015'].id,
    'Walaikum Assalam Fahad! Yes, exactly, and it has a cracked transparent silicon case. I have it safely with me in CS Lab 3.'
  );

  console.log('✓ Demo chat conversation created between Fahad and Hamza.');

  console.log('\n========================================================');
  console.log('✅ Demo Data Seeded Successfully!');
  console.log('   All students can log in with: Password123!');
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('Demo seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
