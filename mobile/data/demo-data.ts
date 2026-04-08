export type DemoStory = {
  id: string;
  name: string;
  accent: string;
};

export type DemoPost = {
  id: string;
  author: string;
  handle: string;
  age: string;
  body: string;
  mood: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
};

export type DemoConversation = {
  id: string;
  name: string;
  status: string;
  message: string;
  time: string;
  unreadCount: number;
};

export type DemoActivity = {
  id: string;
  title: string;
  detail: string;
};

export const demoStories: DemoStory[] = [
  { id: "s1", name: "Amina", accent: "#17b6ff" },
  { id: "s2", name: "Kabelo", accent: "#7b5cff" },
  { id: "s3", name: "Zee", accent: "#ffbd59" },
  { id: "s4", name: "Lebo", accent: "#ff6b8a" },
];

export const demoPosts: DemoPost[] = [
  {
    id: "p1",
    author: "Amina Noor",
    handle: "@aminanoor",
    age: "5m",
    body:
      "Just wrapped a creator meetup in Johannesburg. The energy in this room feels exactly like the FaceMe glow.",
    mood: "Event",
    tags: ["creators", "networking", "jhb"],
    likes: 128,
    comments: 22,
    shares: 7,
  },
  {
    id: "p2",
    author: "Kabelo M",
    handle: "@kabxlo",
    age: "22m",
    body:
      "Testing a new camera setup tonight. Neon gradients, clean portraits, and zero flat lighting.",
    mood: "Studio",
    tags: ["photography", "portrait", "setup"],
    likes: 94,
    comments: 11,
    shares: 4,
  },
  {
    id: "p3",
    author: "Zee Daniels",
    handle: "@zeed",
    age: "1h",
    body:
      "Small reminder: the best profiles feel human. A clear face, one honest line, and work that speaks for itself.",
    mood: "Advice",
    tags: ["brand", "profile", "social"],
    likes: 203,
    comments: 39,
    shares: 16,
  },
];

export const demoConversations: DemoConversation[] = [
  {
    id: "c1",
    name: "Creative Circle",
    status: "4 online",
    message: "Poster draft looks clean. Send version two when ready.",
    time: "09:24",
    unreadCount: 3,
  },
  {
    id: "c2",
    name: "Lebo",
    status: "Seen recently",
    message: "I pushed the new brand colors. Check the shared board.",
    time: "Yesterday",
    unreadCount: 0,
  },
  {
    id: "c3",
    name: "Studio Launch",
    status: "12 members",
    message: "Venue confirmed for Friday night.",
    time: "Yesterday",
    unreadCount: 8,
  },
];

export const demoActivities: DemoActivity[] = [
  {
    id: "a1",
    title: "Profile Strength",
    detail: "Your profile is 82% complete. Add a short bio and website to unlock more visibility.",
  },
  {
    id: "a2",
    title: "Network Pulse",
    detail: "18 people interacted with your content in the last 24 hours.",
  },
  {
    id: "a3",
    title: "Creator Tip",
    detail: "Posts with one clear point and one image get the best response on FaceMe.",
  },
];

export const discoverTopics = [
  "Design Systems",
  "Street Portraits",
  "Creator Economy",
  "Music Drops",
  "Night Shoots",
  "Founders",
];
