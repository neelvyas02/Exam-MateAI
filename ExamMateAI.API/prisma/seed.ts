import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
  const studentPasswordHash = await bcrypt.hash('Student@123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@exammate.ai' },
    update: {},
    create: {
      fullName: 'ExamMate Administrator',
      email: 'admin@exammate.ai',
      passwordHash: adminPasswordHash,
      role: 'Admin',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@exammate.ai' },
    update: {},
    create: {
      fullName: 'Alex Johnson',
      email: 'student@exammate.ai',
      passwordHash: studentPasswordHash,
      role: 'Student',
    },
  });

  console.log('✅ Users seeded:', { admin: admin.email, student: student.email });

  // 2. Seed Subjects
  const subjectsData = [
    {
      name: 'Computer Networks',
      semester: 'Semester 5',
      description: 'Foundations of computer networking, OSI model, TCP/IP, and routing protocols.',
      chapters: [
        { number: '1', name: 'Introduction to Networking & Physical Layer', description: 'Network topologies and physical transmission media.' },
        { number: '2', name: 'Data Link Layer & MAC Protocols', description: 'Error detection, framing, CSMA/CD, and Ethernet.' },
        { number: '3', name: 'Network Layer & IP Routing', description: 'IPv4, IPv6, subnetting, OSPF, and BGP routing algorithms.' },
        { number: '4', name: 'Transport Layer (TCP/UDP)', description: 'Reliable transport, flow control, and congestion mitigation.' },
      ],
    },
    {
      name: 'Database Management Systems',
      semester: 'Semester 4',
      description: 'Relational database concepts, SQL, normalization, and transaction processing.',
      chapters: [
        { number: '1', name: 'Relational Model & Relational Algebra', description: 'Entities, relations, relational algebra operations.' },
        { number: '2', name: 'SQL & Advanced Querying', description: 'DDL, DML, joins, subqueries, and views.' },
        { number: '3', name: 'Database Normalization', description: '1NF, 2NF, 3NF, BCNF, and dependency preservation.' },
        { number: '4', name: 'Transaction Management & Concurrency Control', description: 'ACID properties, serializability, two-phase locking.' },
      ],
    },
    {
      name: 'Operating Systems',
      semester: 'Semester 4',
      description: 'OS architecture, processes, threads, CPU scheduling, memory management, and file systems.',
      chapters: [
        { number: '1', name: 'Process Management & Synchronization', description: 'Processes, threads, IPC, semaphores, and classic sync problems.' },
        { number: '2', name: 'CPU Scheduling Algorithms', description: 'FCFS, SJF, Round Robin, and Priority Scheduling.' },
        { number: '3', name: 'Memory Management & Virtual Memory', description: 'Paging, segmentation, page replacement algorithms.' },
        { number: '4', name: 'File Systems & Storage Management', description: 'File organization, directory structure, disk scheduling.' },
      ],
    },
  ];

  for (const s of subjectsData) {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: s.name },
    });

    const subject = existingSubject
      ? existingSubject
      : await prisma.subject.create({
          data: {
            name: s.name,
            semester: s.semester,
            description: s.description,
            userId: admin.id,
          },
        });

    for (const c of s.chapters) {
      const existingChapter = await prisma.chapter.findFirst({
        where: { subjectId: subject.id, number: c.number },
      });

      if (!existingChapter) {
        await prisma.chapter.create({
          data: {
            subjectId: subject.id,
            number: c.number,
            name: c.name,
            description: c.description,
          },
        });
      }
    }
  }

  console.log('✅ Subjects and chapters seeded.');
  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
