const now = new Date().toISOString();
const bcrypt = require("bcryptjs");
const demoPasswordHash = bcrypt.hashSync("123456", 10);

const subjects = [
  "Math",
  "English",
  "IELTS",
  "Physics",
  "Chemistry",
  "Programming",
  "Biology",
];

const teachers = [
  {
    id: "t1",
    name: "Aysel Mammadova",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
    subject: "Math",
    subjects: ["Math", "Physics"],
    rating: 4.9,
    price: 25,
    location: "Baku",
    coordinates: { lat: 40.4093, lng: 49.8671 },
    experienceYears: 8,
    bio: "SAT ve mekteb proqrami uzre fokuslu ferdi dersler kecirem.",
    reviews: [
      { id: "r1", user: "Nigar", comment: "Cox aydin izah edir.", rating: 5 },
      { id: "r2", user: "Elvin", comment: "Qisa muddetde netice aldim.", rating: 5 },
    ],
  },
  {
    id: "t2",
    name: "Rauf Karimov",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600",
    subject: "English",
    subjects: ["English", "IELTS"],
    rating: 4.8,
    price: 22,
    location: "Sumqayit",
    coordinates: { lat: 40.5897, lng: 49.6686 },
    experienceYears: 6,
    bio: "Speaking ve writing ucun strukturlasdirilmis proqram teqdim edirem.",
    reviews: [{ id: "r3", user: "Kamran", comment: "Mock imtahanlar cox faydalidir.", rating: 5 }],
  },
  {
    id: "t3",
    name: "Leyla Aliyeva",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600",
    subject: "IELTS",
    subjects: ["IELTS", "English"],
    rating: 4.7,
    price: 30,
    location: "Ganja",
    coordinates: { lat: 40.6828, lng: 46.3606 },
    experienceYears: 10,
    bio: "Band 7+ hedefi ucun intensiv IELTS hazirligi.",
    reviews: [{ id: "r4", user: "Ayan", comment: "Yazi feedback-leri eladir.", rating: 4 }],
  },
  {
    id: "t4",
    name: "Tural Hasanov",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600",
    subject: "Programming",
    subjects: ["Programming", "Math"],
    rating: 4.6,
    price: 28,
    location: "Baku",
    coordinates: { lat: 40.4011, lng: 49.8765 },
    experienceYears: 5,
    bio: "Frontend ve alqoritm movzularini praktiki tapsiriqlarla oyredirem.",
    reviews: [{ id: "r5", user: "Murad", comment: "Canli coding sessiyalari cox effektivdir.", rating: 5 }],
  },
];

const users = [
  {
    id: "u1",
    role: "student",
    name: "Demo Student",
    email: "student@example.com",
    passwordHash: demoPasswordHash,
    phone: "+994501112233",
    createdAt: now,
  },
  {
    id: "u2",
    role: "teacher",
    teacherId: "t1",
    name: "Aysel Mammadova",
    email: "teacher@example.com",
    passwordHash: demoPasswordHash,
    phone: "+994507778899",
    createdAt: now,
  },
];

const bookings = [
  {
    id: "b1",
    studentId: "u1",
    teacherId: "t1",
    note: "Həftədə 3 dəfə dərs istəyirəm",
    status: "pending",
    createdAt: now,
  },
];

const teacherApplications = [];

module.exports = {
  subjects,
  teachers,
  users,
  bookings,
  teacherApplications,
};
