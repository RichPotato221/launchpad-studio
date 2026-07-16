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
  "arts-entertainment-sports": { src: "/images/departments/arts-entertainment-sports/cover-hero.jpg", alt: "Arts, Entertainment & Sports Department cover photo" },
  media: { src: "/images/departments/media/cover-hero.jpg", alt: "Media Department cover photo" },
  hospitality: { src: "/images/departments/hospitality/cover-hero.jpg", alt: "Hospitality Department cover photo" },
  finance: { src: "/images/departments/finance/cover-hero.jpg", alt: "Finance Department cover photo" },
  "mens-ministry": { src: "/images/departments/mens-ministry/cover-hero.jpg", alt: "Men's Ministry cover photo" },
  "prayer-intercession": { src: "/images/departments/prayer-intercession/cover-hero.jpg", alt: "Prayer & Intercession Department cover photo" },
  "outreach-evangelism": { src: "/images/departments/outreach-evangelism/cover-hero.jpg", alt: "Evangelism & Outreach Department cover photo" },
  "business-economics": { src: "/images/departments/business-economics/cover-hero.jpg", alt: "Business & Economics Department cover photo" },
  education: { src: "/images/departments/education/cover-hero.jpg", alt: "Education Department cover photo" },
  government: { src: "/images/departments/government/cover-hero.jpg", alt: "Government Department cover photo" },
  "youth-ministry": { src: "/images/departments/youth-ministry/cover-hero.jpg", alt: "Youth Ministry cover photo" },
  ushers: { src: "/images/departments/ushers/cover-hero.jpg", alt: "Ushers Department cover photo" },
};

// Extra imagery per department
export const DEPARTMENT_GALLERY: Record<string, { src: string; alt: string }[]> = {
  "school-of-ministry": [
    { src: "/images/departments/school-of-ministry/leader-address-2.jpg", alt: "School of Ministry — instructor emphasizing a teaching point" },
  ],
  "childrens-ministry": [
    { src: "/images/departments/childrens-ministry/face-painting-session.jpg", alt: "Children's Ministry volunteer face-painting a child" },
  ],
};
