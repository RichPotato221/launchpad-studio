import preaching from "@/assets/preaching.jpg";
import sermonSeat from "@/assets/sermon-seat.jpg";
import worshipWoman from "@/assets/worship-woman.jpg";
import podiumWoman from "@/assets/podium-woman.jpg";
import leaderSuit from "@/assets/leader-suit.jpg";
import leaderVest from "@/assets/leader-vest.jpg";
import ringsFamily from "@/assets/rings-family.jpg";

export type Department = {
  slug: string;
  name: string;
  pillar: string;
  scripture: string;
  vision: string;
  mission: string;
  purpose: string;
  functions: string[];
  image: string;
  manuals: string[]; // manual keys
};

export const MANUALS: Record<string, { title: string; href: string; note: string }> = {
  constitution: {
    title: "Apostolic Constitution",
    href: "/manuals/1_Apostolic_Constitution.docx",
    note: "Volume I — governing framework and articles of faith.",
  },
  governance: {
    title: "Governance Manual",
    href: "/manuals/2_Governance_Manual.docx",
    note: "Volume II — leadership structure, reporting and accountability.",
  },
  operations: {
    title: "Ministry Operations Manual",
    href: "/manuals/3_Ministry_Operations_Manual.docx",
    note: "Volume III — how each department plans, runs and reports.",
  },
  finance: {
    title: "Finance Manual",
    href: "/manuals/4_Finance_Manual.docx",
    note: "Volume IV — stewardship, budgeting and compliance.",
  },
  kpi: {
    title: "KPI Manual",
    href: "/manuals/5_KPI_Manual.docx",
    note: "Volume V — key performance indicators and reporting cycle.",
  },
};

export const DEPARTMENTS: Department[] = [
  {
    slug: "worship-and-creative-arts",
    name: "Worship & Creative Arts",
    pillar: "Worship & Prayer",
    scripture: "John 4:23–24",
    vision:
      "To usher the church into Spirit-led, biblically sound worship that reveals the presence and glory of God.",
    mission:
      "Cultivate a worship culture rooted in intimacy with the Father, excellence in artistry, and reverence for Scripture.",
    purpose:
      "Prepare the atmosphere for the Word, disciple worshippers as ministers, and steward the creative gifts within the body.",
    functions: [
      "Set weekly song lists and scriptural readings under pastoral oversight.",
      "Lead technical, musical and hospitality teams for every service.",
      "Plan seasonal worship series and prophetic worship gatherings.",
      "Train and disciple worshippers, musicians and technicians.",
    ],
    image: podiumWoman,
    manuals: ["operations", "kpi", "governance"],
  },
  {
    slug: "discipleship-and-education",
    name: "Discipleship & Education",
    pillar: "Discipleship & Education",
    scripture: "Matthew 28:19–20",
    vision:
      "To doctrinally equip the saints in alignment with the biblical standards of God’s Kingdom.",
    mission:
      "Consistently teach and mature believers in sound doctrine and Christ-centred living.",
    purpose:
      "Move believers from conversion to maturity through structured teaching, small groups and one-to-one mentoring.",
    functions: [
      "Design and deliver Bible studies, membership classes and School of Ministry curriculum.",
      "Coordinate small groups and disciple-making pathways.",
      "Track spiritual growth, class completion and mentoring outcomes.",
      "Train teachers and mentors using standardised SOPs.",
    ],
    image: sermonSeat,
    manuals: ["operations", "constitution", "kpi"],
  },
  {
    slug: "outreach-and-missions",
    name: "Outreach & Missions",
    pillar: "Outreach & Community",
    scripture: "Acts 1:8",
    vision:
      "To commission fully equipped ambassadors and establish Kingdom Centres for global assignments.",
    mission:
      "Reach the lost, serve the community, and plant new Kingdom Centres in obedience to the Great Commission.",
    purpose:
      "Move the church beyond its walls with evangelism, mercy and church planting under apostolic oversight.",
    functions: [
      "Plan evangelism campaigns, community service and mercy projects.",
      "Recruit and train outreach teams and mission planters.",
      "Steward partnerships with other Kingdom-minded organisations.",
      "Report on souls reached, follow-up and long-term church plants.",
    ],
    image: preaching,
    manuals: ["operations", "governance", "finance"],
  },
  {
    slug: "media-and-communications",
    name: "Media & Communications",
    pillar: "Discipleship & Education",
    scripture: "Habakkuk 2:2",
    vision:
      "To carry the sound and message of the house with clarity, distinction and doctrinal integrity.",
    mission:
      "Amplify the teaching of the house through social media, livestream, web and print in a way that honours Christ.",
    purpose:
      "Ensure every published word and image is pre-approved for doctrinal soundness and brand distinction.",
    functions: [
      "Manage website, social media, livestream and content calendars.",
      "Design and pre-approve all visual, audio and written content.",
      "Support other departments with promotional and teaching materials.",
      "Track engagement metrics and include them in monthly reports.",
    ],
    image: worshipWoman,
    manuals: ["operations", "kpi"],
  },
  {
    slug: "youth-and-childrens-ministry",
    name: "Youth & Children’s Ministry",
    pillar: "Discipleship & Education",
    scripture: "Proverbs 22:6",
    vision:
      "To raise a generation that carries a Christ-centred nature and culture from childhood into destiny.",
    mission:
      "Disciple children and youth with age-appropriate teaching, safe environments and intentional mentoring.",
    purpose:
      "Establish spiritual foundations in the next generation and prepare them as ambassadors for Kingdom assignments.",
    functions: [
      "Deliver weekly Sunday school and youth programmes with approved curriculum.",
      "Enforce child protection, safety and safeguarding protocols.",
      "Train and screen volunteer teachers each term.",
      "Track retention, spiritual growth and family engagement.",
    ],
    image: ringsFamily,
    manuals: ["operations", "governance", "constitution"],
  },
  {
    slug: "finance-and-administration",
    name: "Finance & Administration",
    pillar: "Administration & Care",
    scripture: "Luke 16:10–11",
    vision:
      "To steward every resource entrusted to the house with integrity, transparency and Kingdom purpose.",
    mission:
      "Uphold biblical stewardship through disciplined budgeting, reporting and compliance across the church.",
    purpose:
      "Resource the vision, protect the church legally and financially, and provide accurate reporting to leadership.",
    functions: [
      "Prepare and monitor the annual budget with the Senior Apostle.",
      "Receive, count and deposit tithes and offerings under dual control.",
      "Maintain accurate records and arrange periodic independent audits.",
      "Ensure legal compliance for non-profit and payroll obligations.",
    ],
    image: leaderSuit,
    manuals: ["finance", "governance", "constitution"],
  },
  {
    slug: "school-of-ministry",
    name: "School of Ministry",
    pillar: "Discipleship & Education",
    scripture: "2 Timothy 2:2",
    vision:
      "To train and develop leaders and ministers called for Kingdom purposes.",
    mission:
      "Provide systematic teaching in doctrine, ministry skills and character formation for emerging leaders.",
    purpose:
      "Prepare and commission ambassadors who can plant, pastor and pioneer under apostolic covering.",
    functions: [
      "Design and deliver the School of Ministry curriculum.",
      "Assess student character, calling and doctrinal alignment.",
      "Confer certificates and recommend candidates for ordination.",
      "Send graduates into ministry assignments locally and globally.",
    ],
    image: leaderVest,
    manuals: ["operations", "constitution", "governance"],
  },
];

export const SEVEN_MOUNTAINS = [
  {
    key: "religion",
    name: "Religion",
    verse: "Matthew 16:18",
    purpose:
      "Restore integrity and purity within the prophetic ministry and equip the church to disciple nations.",
  },
  {
    key: "family",
    name: "Family",
    verse: "Ephesians 5:22–33",
    purpose:
      "Build Christ-centred marriages and homes as the primary discipling environment.",
  },
  {
    key: "education",
    name: "Education",
    verse: "Proverbs 1:7",
    purpose:
      "Raise Kingdom-minded educators and learners who influence curriculum and campus culture.",
  },
  {
    key: "government",
    name: "Government",
    verse: "Isaiah 9:6–7",
    purpose:
      "Send righteous ambassadors into civic life who legislate and lead in the fear of the Lord.",
  },
  {
    key: "media",
    name: "Media",
    verse: "Habakkuk 2:2",
    purpose:
      "Shape the narrative of the age with truthful, excellent and distinctly Christ-honouring content.",
  },
  {
    key: "arts",
    name: "Arts & Entertainment",
    verse: "Exodus 31:1–5",
    purpose:
      "Release Spirit-empowered creativity that reveals the beauty and character of God.",
  },
  {
    key: "business",
    name: "Business",
    verse: "Deuteronomy 8:18",
    purpose:
      "Empower marketplace ambassadors to generate wealth for Kingdom assignments with integrity.",
  },
] as const;
