// Photo mapping wired to /public/images (see trogkc-assets/INSTRUCTIONS.md)
import outreachCover from "@/assets/dept/outreach-evangelism.png.asset.json";
import womensCover from "@/assets/dept/womens-ministry.png.asset.json";
import mensCover from "@/assets/dept/mens-ministry.png.asset.json";
import somCover from "@/assets/dept/school-of-ministry.png.asset.json";
import discipleshipCover from "@/assets/dept/discipleship.png.asset.json";
import mediaCover from "@/assets/dept/media.png.asset.json";
import ushersCover from "@/assets/dept/ushers.png.asset.json";
import hospitalityCover from "@/assets/dept/hospitality.png.asset.json";
import prayerCover from "@/assets/dept/prayer-intercession.png.asset.json";
import childrensCover from "@/assets/dept/childrens-ministry.png.asset.json";
import soundTechCover from "@/assets/dept/sound-technical.png.asset.json";
import youthCover from "@/assets/dept/youth-ministry.png.asset.json";
import worshipCover from "@/assets/dept/worship.png.asset.json";
import associatePastorCover from "@/assets/dept/associate-pastor.png.asset.json";
import financeCover from "@/assets/dept/finance.webp.asset.json";
import chairpersonCover from "@/assets/dept/chairperson.webp.asset.json";
import strategicAdviserCover from "@/assets/dept/strategic-adviser.webp.asset.json";
import resourceAdminCover from "@/assets/dept/resource-administrator.webp.asset.json";
import secretaryCover from "@/assets/dept/secretary.webp.asset.json";
import leadPastorCover from "@/assets/dept/lead-pastor.webp.asset.json";
import eldersCover from "@/assets/dept/elders.webp.asset.json";
import lifeGroupsCover from "@/assets/dept/life-groups.webp.asset.json";
import handOfChristCover from "@/assets/dept/hand-of-christ.webp.asset.json";
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
  worship: { src: worshipCover.url, alt: "Worship / Music Team emblem" },
  protocol: { src: "/images/departments/protocol/podium-announcement.jpg", alt: "Protocol Department — formal announcement at the podium" },
  "childrens-ministry": { src: childrensCover.url, alt: "Children's Ministry emblem" },
  "sound-technical": { src: soundTechCover.url, alt: "Sound & Technical Team emblem" },
  discipleship: { src: discipleshipCover.url, alt: "Discipleship — open Bible emblem" },
  "school-of-ministry": { src: somCover.url, alt: "School of Ministry emblem" },
  "womens-ministry": { src: womensCover.url, alt: "Women's Ministry emblem" },
  family: { src: "/images/seven-mountains/family/family-portrait.jpg", alt: "Family Mountain — family portrait" },
  religion: { src: "/images/seven-mountains/religion-five-fold/teaching/teaching-ministry-session.jpg", alt: "Religion Mountain — teaching ministry session" },
  teaching: { src: "/images/seven-mountains/religion-five-fold/teaching/teaching-ministry-session.jpg", alt: "Teaching Ministry — seated address during a teaching session" },
  "arts-entertainment-sports": { src: "/images/departments/arts-entertainment-sports/cover-hero.jpg", alt: "Arts, Entertainment & Sports Department cover photo" },
  media: { src: mediaCover.url, alt: "Media Department emblem" },
  "media-communication": { src: "/images/departments/media/cover-hero.jpg", alt: "Media & Communication Department cover photo" },
  hospitality: { src: hospitalityCover.url, alt: "Hospitality Department emblem" },
  finance: { src: financeCover.url, alt: "Financial Administrator emblem" },
  "mens-ministry": { src: mensCover.url, alt: "Men's Ministry emblem" },
  "prayer-intercession": { src: prayerCover.url, alt: "Prayer & Intercession emblem" },
  "outreach-evangelism": { src: outreachCover.url, alt: "Outreach & Evangelism emblem" },
  "business-economics": { src: "/images/departments/business-economics/cover-hero.jpg", alt: "Business & Economics Department cover photo" },
  education: { src: "/images/departments/education/cover-hero.jpg", alt: "Education Department cover photo" },
  government: { src: "/images/departments/government/cover-hero.jpg", alt: "Government Department cover photo" },
  "youth-ministry": { src: youthCover.url, alt: "Youth Ministry emblem" },
  "associate-pastor": { src: associatePastorCover.url, alt: "Office of the Associate Pastor emblem" },
  "lead-pastor": { src: leadPastorCover.url, alt: "Office of the Assistant Pastor emblem" },
  chairperson: { src: chairpersonCover.url, alt: "Office of the Chairperson emblem" },
  secretary: { src: secretaryCover.url, alt: "Office of the Church Secretary emblem" },
  "strategic-adviser": { src: strategicAdviserCover.url, alt: "Strategic Advisor & Planner emblem" },
  "resource-administrator": { src: resourceAdminCover.url, alt: "Resource Administrator emblem" },
  elders: { src: eldersCover.url, alt: "Elders emblem" },
  "life-groups": { src: lifeGroupsCover.url, alt: "Life Groups emblem" },
  "hand-of-christ": { src: handOfChristCover.url, alt: "Hand of Christ emblem" },
  ushers: { src: ushersCover.url, alt: "Ushers Department emblem" },
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
