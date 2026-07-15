// Photo mapping wired to /public/images (see trogkc-assets/INSTRUCTIONS.md)
export const PORTAL_IMAGES = {
  logo: "/images/landing/logo-flame-emblem.jpg",
  marchingOrdersBanner: "/images/landing/marching-orders-2026-banner.jpg",
  seniorPastor: "/images/landing/senior-pastor-portrait.jpg",
  governanceSecretary: "/images/governance/secretary-podium-reading.jpg",
  sevenMountainsMale: "/images/seven-mountains/overview/male-leader-studio.jpg",
  sevenMountainsFemale: "/images/seven-mountains/overview/female-leader-studio.jpg",
} as const;

// Department slug → hero image (matches supabase department slugs)
export const DEPARTMENT_HERO: Record<string, { src: string; alt: string }> = {
  worship: { src: "/images/departments/worship/worship-leader-podium.jpg", alt: "Worship Department — team member ministering at the podium" },
  protocol: { src: "/images/departments/protocol/podium-announcement.jpg", alt: "Protocol Department — formal announcement at the podium" },
  "childrens-ministry": { src: "/images/departments/childrens-ministry/face-paint-group.jpg", alt: "Children's Ministry — kids with face paint at a church event" },
  discipleship: { src: "/images/departments/discipleship/teaching-session.jpg", alt: "Discipleship — informal teaching session" },
  "school-of-ministry": { src: "/images/departments/school-of-ministry/leader-address-1.jpg", alt: "School of Ministry — teaching session, formal address" },
  "womens-ministry": { src: "/images/departments/womens-ministry/leader-portrait.jpg", alt: "Women's Ministry leader studio portrait" },
  family: { src: "/images/seven-mountains/family/family-portrait.jpg", alt: "Family Mountain — family portrait" },
  religion: { src: "/images/seven-mountains/religion-five-fold/teaching/teaching-ministry-session.jpg", alt: "Religion Mountain — teaching ministry session" },
  teaching: { src: "/images/seven-mountains/religion-five-fold/teaching/teaching-ministry-session.jpg", alt: "Teaching Ministry — seated address during a teaching session" },
};

// Extra imagery per department
export const DEPARTMENT_GALLERY: Record<string, { src: string; alt: string }[]> = {
  "school-of-ministry": [
    { src: "/images/departments/school-of-ministry/leader-address-2.jpg", alt: "School of Ministry — instructor emphasizing a teaching point" },
  ],
  "childrens-ministry": [
    { src: "/images/departments/childrens-ministry/face-painting-session.jpg", alt: "Children's Ministry volunteer face-painting a child" },
  ],
  family: [
    { src: "/images/seven-mountains/family/hands-covenant-closeup.jpg", alt: "Family Mountain — hands joined, covenant close-up" },
  ],
};
