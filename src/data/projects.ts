// src/data/projects.ts
import type { LatLngTuple } from 'leaflet';

export type ProjectStatus = 'active' | 'construction' | 'planned' | 'paused' | 'rejected';

export interface PublicRecord {
  title: string;
  url: string;
}

export interface Project {
  name: string;
  description: string;
  coordinates: LatLngTuple;
  url: string;
  businessImpact: string;
  status: ProjectStatus;
  // Enhanced public accountability metrics
  estimatedCost?: string;
  powerCapacityMW?: string;
  waterFootprint?: string;
  publicRecord?: PublicRecord;
}

export const clientProjects: Project[] = [
  // ==========================================
  // ACTIVE / OPERATIONAL SITES (13 TOTAL)
  // ==========================================
  {
    name: "Minneapolis Downtown Gateway Hub",
    description: "Carrier-hotel enterprise data center facility channeling downtown fiber backbones.",
    coordinates: [44.9778, -93.2650],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | High-density urban grid interconnect network.",
    status: "active",
    estimatedCost: "$120 Million",
    powerCapacityMW: "45 MW",
    waterFootprint: "Closed-loop system (Minimal draw)",
    publicRecord: {
      title: "City of Minneapolis Zoning Minutes",
      url: "https://lims.minneapolismn.gov/"
    }
  },
  {
    name: "Eagan DataBank Campus (MSP1)",
    description: "Enterprise operational multi-tenant facility providing regional cloud storage architecture frameworks.",
    coordinates: [44.8042, -93.1669],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Tier III compliance status verification.",
    status: "active",
    estimatedCost: "$250 Million",
    powerCapacityMW: "60 MW",
    waterFootprint: "Air-cooled optimization arrays",
    publicRecord: {
      title: "DataBank MSP1 Expansion Review",
      url: "https://www.databank.com/data-centers/minneapolis/"
    }
  },
  {
    name: "Eagan Technology Corridor (MSP2)",
    description: "Secondary operational hyper-scale footprint catering to core health tech backups.",
    coordinates: [44.8210, -93.1540],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Redundant grid loops live.",
    status: "active",
    estimatedCost: "$180 Million",
    powerCapacityMW: "40 MW",
    waterFootprint: "Evaporative fallback (Low intensity)",
    publicRecord: {
      title: "Dakota County GIS Infrastructure Maps",
      url: "https://www.co.dakota.mn.us/"
    }
  },
  {
    name: "Shakopee Enterprise Data Center",
    description: "Hyperscale computing facility supporting commercial financial transaction backups.",
    coordinates: [44.7812, -93.5230],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | High-efficiency mechanical chiller operations.",
    status: "active",
    estimatedCost: "$310 Million",
    powerCapacityMW: "85 MW",
    waterFootprint: "35 Million Gallons/Year (Estimated)",
    publicRecord: {
      title: "Shakopee Planning Commission Authorization",
      url: "https://www.shakopeemn.gov/"
    }
  },
  {
    name: "Bloomington Industrial Data Hub",
    description: "Legacy operational framework supporting regional telecommunication nodes.",
    coordinates: [44.8408, -93.2983],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Continuous runtime monitoring active.",
    status: "active",
    estimatedCost: "$85 Million",
    powerCapacityMW: "20 MW",
    waterFootprint: "Closed-loop system",
    publicRecord: {
      title: "Bloomington Commercial Site Approvals",
      url: "https://www.bloomingtonmn.gov/"
    }
  },
  {
    name: "Brooklyn Park Technology Center",
    description: "Co-location operational space utilized for multi-county civil information hosting.",
    coordinates: [45.0943, -93.3563],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Core infrastructure fiber pathways validated.",
    status: "active",
    estimatedCost: "$140 Million",
    powerCapacityMW: "35 MW",
    waterFootprint: "Direct expansion air cooling",
    publicRecord: {
      title: "Hennepin County Procurement Registry",
      url: "https://www.hennepin.us/"
    }
  },
  {
    name: "Woodbury Regional Cloud Hub",
    description: "Operational enterprise node providing localized computing arrays for eastern suburbs.",
    coordinates: [44.9238, -92.9514],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Grid load balanced across regional grid ties.",
    status: "active",
    estimatedCost: "$165 Million",
    powerCapacityMW: "30 MW",
    waterFootprint: "Municipal water connection utilities",
    publicRecord: {
      title: "City of Woodbury Development Applications",
      url: "https://www.woodburymn.gov/"
    }
  },
  {
    name: "Duluth Edge Infrastructure Node",
    description: "Operational Northern Minnesota climate-cooled server framework backing regional medical systems.",
    coordinates: [46.7867, -92.1005],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Ambient cold-air optimization cooling designs.",
    status: "active",
    estimatedCost: "$95 Million",
    powerCapacityMW: "15 MW",
    waterFootprint: "Free-air cooling (Extremely Low)",
    publicRecord: {
      title: "St. Louis County Land Use Portal",
      url: "https://www.stlouiscountymn.gov/"
    }
  },
  {
    name: "St. Cloud Core Facility",
    description: "Regional active enterprise node linking central Minnesota university data backbones.",
    coordinates: [45.5579, -94.1632],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Direct regional backbone fiber integration.",
    status: "active",
    estimatedCost: "$110 Million",
    powerCapacityMW: "25 MW",
    waterFootprint: "Municipal system allocation",
    publicRecord: {
      title: "Central MN Infrastructure Planning Report",
      url: "https://www.ci.stcloud.mn.us/"
    }
  },
  {
    name: "Rochester Medical Data Vault",
    description: "High-security operational node handling institutional diagnostic cloud processing.",
    coordinates: [44.0234, -92.4629],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Zero-downtime redundant battery topologies active.",
    status: "active",
    estimatedCost: "$210 Million",
    powerCapacityMW: "50 MW",
    waterFootprint: "Chilled water loop loops with safety containment",
    publicRecord: {
      title: "Olmsted County Public Health Environmental Review",
      url: "https://www.olmstedcounty.gov/"
    }
  },
  {
    name: "Plymouth Technology Vault",
    description: "Active corporate disaster-recovery framework server array handling secure commerce files.",
    coordinates: [45.0105, -93.4552],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Hardened outer shell structural verification.",
    status: "active",
    estimatedCost: "$135 Million",
    powerCapacityMW: "28 MW",
    waterFootprint: "Standard closed industrial chillers",
    publicRecord: {
      title: "Plymouth Engineering Division Standard Codes",
      url: "https://www.plymouthmn.gov/"
    }
  },
  {
    name: "Mankato Regional Hosting Site",
    description: "Operational rural edge computing system optimized for local agricultural logistics networks.",
    coordinates: [44.1636, -93.9994],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | Clean energy purchase agreements finalized.",
    status: "active",
    estimatedCost: "$75 Million",
    powerCapacityMW: "18 MW",
    waterFootprint: "Air economizer configuration",
    publicRecord: {
      title: "Blue Earth County Board of Commissioners Minutes",
      url: "https://www.blueearthcountymn.gov/"
    }
  },
  {
    name: "Inver Grove Heights Data Hub",
    description: "Active transit-switching terminal helping distribute high-volume regional transport files.",
    coordinates: [44.8481, -93.0425],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Operational</strong> | High-throughput low-latency network routing.",
    status: "active",
    estimatedCost: "$90 Million",
    powerCapacityMW: "22 MW",
    waterFootprint: "Minimal domestic utility only",
    publicRecord: {
      title: "IGH Council Interim Data Center Ordinance Study",
      url: "https://www.ighmn.gov/"
    }
  },

  // ==========================================
  // PLANNED / ONGOING / PIPELINE (14 TOTAL)
  // ==========================================
  {
    name: "Meta Rosemount Campus",
    description: "An $800 million, 715,000 sq. ft. hyper-scale facility built for large-scale AI workloads.",
    coordinates: [44.7303, -93.0185],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "⚡ <strong>Construction Wrap-up</strong> | 308 MW AI optimization workloads.",
    status: "construction",
    estimatedCost: "$800 Million",
    powerCapacityMW: "308 MW",
    waterFootprint: "Estimated 60+ Million Gallons/Year configured",
    publicRecord: {
      title: "Minnesota PUC Grid Load Tariffs Docket",
      url: "https://mn.gov/puc/"
    }
  },
  {
    name: "Monticello Tech Park (Frattalone / Microsoft)",
    description: "Proposed $5 billion, 3-million sq. ft. massive campus spanning six separate data halls.",
    coordinates: [45.2755, -93.7912],
    url: "https://monticellomn.gov/728/Data-Centers",
    businessImpact: "🟢 <strong>Rezoning Approved</strong> | 400+ MW ultimate site load footprint layout.",
    status: "planned",
    estimatedCost: "$5.0 Billion",
    powerCapacityMW: "400 MW",
    waterFootprint: "Pending Environmental Assessment Worksheet (EAW)",
    publicRecord: {
      title: "City of Monticello Comprehensive Plan Rezoning Map",
      url: "https://monticellomn.gov/728/Data-Centers"
    }
  },
  {
    name: "Scannell Technology Park (Monticello)",
    description: "Planned 106-acre data center footprint layout seeking 150MW capacity output by 2027.",
    coordinates: [45.2891, -93.8184],
    url: "https://monticellomn.gov/728/Data-Centers",
    businessImpact: "🟢 <strong>Comp Plan Amended</strong> | Four phased 320,000 sq. ft. data structures planned.",
    status: "planned",
    estimatedCost: "$450 Million",
    powerCapacityMW: "150 MW",
    waterFootprint: "Phased connection allocation tracking",
    publicRecord: {
      title: "Monticello Economic Development Authority Filings",
      url: "https://monticellomn.gov/728/Data-Centers"
    }
  },
  {
    name: "Tract Cannon Falls Technology Park",
    description: "A massive multi-story 1.2-1.3 million sq. ft. regional tech center layout spanning across a custom 240-acre infrastructure parcel.",
    coordinates: [44.5264, -92.9341],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Development Compact Finalized</strong> | Projected 10,000 seasonal builder jobs.",
    status: "planned",
    estimatedCost: "$1.2 Billion",
    powerCapacityMW: "240 MW",
    waterFootprint: "50+ Million Gallons/Year project threshold requested",
    publicRecord: {
      title: "Randolph Township Annexation Dispute Archive",
      url: "https://www.house.mn.gov/members/profile/news/15602/51328"
    }
  },
  {
    name: "Hermantown: Project Loon (Google)",
    description: "A planned $2 billion, 1.8 million sq. ft. project heavily contested in local courts due to ongoing community environmental mitigation debates.",
    coordinates: [46.8042, -92.2858],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟡 <strong>Environmental Review Testing</strong> | Initial $130M infrastructure extension investment.",
    status: "planned",
    estimatedCost: "$2.0 Billion",
    powerCapacityMW: "180 MW",
    waterFootprint: "Contested aquifer impact targets under legal review",
    publicRecord: {
      title: "St. Louis County District Court Case Filings",
      url: "https://www.mncenter.org/data-centers"
    }
  },
  {
    name: "Elk River Data Center (IronGate)",
    description: "Proposed 60,000 sq. ft., 33 MW data facility generating local traction due to proximity with local school fields.",
    coordinates: [45.3288, -93.5704],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🟢 <strong>Public Hearings Active</strong> | Projected 50%+ local municipal energy draw load increase.",
    status: "planned",
    estimatedCost: "$115 Million",
    powerCapacityMW: "33 MW",
    waterFootprint: "Closed loops loop variant promised by developers",
    publicRecord: {
      title: "Elk River City Council Public Hearing Agenda",
      url: "https://www.elkrivermn.gov/"
    }
  },
  {
    name: "Pine Island: Project Skyway (Google)",
    description: "A 482-acre regional power infrastructure play designed to pull 1,900 MW. Currently frozen by a district court restraining order.",
    coordinates: [44.2215, -92.6410],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🔴 <strong>Legal Restraining Order</strong> | $20M infrastructure upgrades currently frozen.",
    status: "paused",
    estimatedCost: "$3.5 Billion",
    powerCapacityMW: "1,900 MW",
    waterFootprint: "Massive localized aquifer draw concerns pending court resolution",
    publicRecord: {
      title: "Third District Court Temporary Injunction Decrees",
      url: "https://www.mncourts.gov/"
    }
  },
  {
    name: "Faribault Industrial Campus (Archer)",
    description: "Planned 500,000 sq. ft. industrial campus footprint over 84.3 acres. Halted by a formal MCEA environmental appeal court order.",
    coordinates: [44.3218, -93.2562],
    url: "https://www.archerdatacenters.com/news-resources/archer-acquires-land-in-faribault-minnesota-for-120mw-data-center-campus-g68bg",
    businessImpact: "🔴 <strong>Court Action Pause</strong> | 120 MW design footprint delayed pending appellate review.",
    status: "paused",
    estimatedCost: "$280 Million",
    powerCapacityMW: "120 MW",
    waterFootprint: "MCEA Water Appropriations Appeal Pending",
    publicRecord: {
      title: "Minnesota Court of Appeals Case Filings",
      url: "https://www.mncenter.org/data-centers"
    }
  },
  {
    name: "Chanhassen Proposed Cloud Core",
    description: "Pipeline enterprise application undergoing municipal zoning reviews for data-density approvals.",
    coordinates: [44.8618, -93.5322],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🔵 <strong>Planned Stage</strong> | Local land review filings open.",
    status: "planned",
    estimatedCost: "$145 Million",
    powerCapacityMW: "32 MW",
    waterFootprint: "Standard regional treatment system connections",
    publicRecord: {
      title: "Chanhassen Community Development Board Ledger",
      url: "https://www.ci.chanhassen.mn.us/"
    }
  },
  {
    name: "Coon Rapids Data Ridge Project",
    description: "Proposed grid modification project tracking substation expansion for future compute spaces.",
    coordinates: [45.1732, -93.2877],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🔵 <strong>Planned Stage</strong> | Feasibility power parameters ongoing.",
    status: "planned",
    estimatedCost: "$70 Million",
    powerCapacityMW: "50 MW (Substation Upgrade)",
    waterFootprint: "None at current transmission stage",
    publicRecord: {
      title: "Anoka County Utility Transmission Proposals",
      url: "https://www.coonrapidsmn.gov/"
    }
  },
  {
    name: "Otsego Infrastructure Expansion",
    description: "Proposed secondary hyper-scale data tract pending environmental worksheet submittals.",
    coordinates: [45.2750, -93.5788],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🔵 <strong>Planned Stage</strong> | Watershed impact models tracking.",
    status: "planned",
    estimatedCost: "$380 Million",
    powerCapacityMW: "90 MW",
    waterFootprint: "Watershed board review framework tracking",
    publicRecord: {
      title: "Wright County Watershed Management District Review",
      url: "https://www.co.wright.mn.us/"
    }
  },
  {
    name: "Maple Grove Technology Hub",
    description: "Pipeline multi-tenant server facility layout seeking final variance authorizations.",
    coordinates: [45.1012, -93.4425],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🔵 <strong>Planned Stage</strong> | Review timeline ongoing via town boards.",
    status: "planned",
    estimatedCost: "$190 Million",
    powerCapacityMW: "45 MW",
    waterFootprint: "Chilled fluid loop optimization",
    publicRecord: {
      title: "Maple Grove Planning and Zoning Commission Minutes",
      url: "https://www.maplegrovemn.gov/"
    }
  },
  {
    name: "Burnsville Grid Compute Proposal",
    description: "Proposed development infrastructure plot targeting industrial zone line adaptations near the river.",
    coordinates: [44.7674, -93.2776],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🔵 <strong>Planned Stage</strong> | Pre-application discussions underway.",
    status: "planned",
    estimatedCost: "$220 Million",
    powerCapacityMW: "75 MW",
    waterFootprint: "Minnesota River protected setbacks analysis required",
    publicRecord: {
      title: "Burnsville Environmental Quality Board Logs",
      url: "https://www.burnsvillemn.gov/"
    }
  },
  {
    name: "Oakdale Fiber Intercept Station",
    description: "Proposed low-footprint caching server array mapping out high power configurations.",
    coordinates: [44.9815, -92.9641],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "🔵 <strong>Planned Stage</strong> | Structural variance tracking.",
    status: "planned",
    estimatedCost: "$55 Million",
    powerCapacityMW: "12 MW",
    waterFootprint: "Minimal dry air topology configuration",
    publicRecord: {
      title: "Washington County Recorder Property Variances",
      url: "https://www.co.washington.mn.us/"
    }
  },

  // ==========================================
  // REJECTED / WITHDRAWN SITES (HISTORICAL)
  // ==========================================
  {
    name: "Nobles County Campus (Geronimo Power)",
    description: "A $4 billion, 2.5 million sq. ft. massive rural design framework killed to protect local agricultural zoning protections.",
    coordinates: [43.6661, -95.9405],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "❌ <strong>Definitively Rejected</strong> | Denied via a 3-2 local county commissioner vote.",
    status: "rejected",
    estimatedCost: "$4.0 Billion",
    powerCapacityMW: "500 MW",
    waterFootprint: "Denied before water resource validation profiles completed",
    publicRecord: {
      title: "Nobles County Board of Commissioners Official Voting Record",
      url: "https://www.co.nobles.mn.us/"
    }
  },
  {
    name: "North Mankato Tech Facility (Oppidan)",
    description: "Early exploratory venture dropped entirely by Oppidan Investment following early environmental pushback actions.",
    coordinates: [44.1812, -94.0415],
    url: "https://couriermn.com/news/environment/where-are-data-centers-being-proposed-in-minnesota-we-are-tracking-them/",
    businessImpact: "❌ <strong>Officially Withdrawn</strong> | Lawsuit voluntarily dismissed once developer scrubbed applications.",
    status: "rejected",
    estimatedCost: "$600 Million",
    powerCapacityMW: "110 MW",
    waterFootprint: "Voluntarily abandoned under citizen environmental scrutiny",
    publicRecord: {
      title: "North Mankato Voluntary Project Termination Records",
      url: "https://www.northmankato.com/"
    }
  }
];