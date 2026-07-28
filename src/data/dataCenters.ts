// src/data/dataCenters.ts

/** [latitude, longitude] pair. Kept local so this module has no dependency on Leaflet. */
export type LatLngTuple = [number, number];

export type ProjectStatus = 'active' | 'construction' | 'planned' | 'paused' | 'rejected';

/**
 * Where a site sits in Minnesota's environmental-review / litigation pipeline.
 * Deliberately orthogonal to `status`: a site can be under active construction
 * *and* facing an EAW challenge, or paused for reasons that are purely
 * commercial. Organizers need the two axes separately to know where legal
 * support actually moves the needle.
 *
 * - `compliant`       — no known state-level review challenge or active suit
 * - `eaw_challenged`  — citizen petition / contested Environmental Assessment Worksheet
 * - `eis_ordered`     — agency ordered a full Environmental Impact Statement
 * - `court_paused`    — restraining order, stay, or appellate ruling halting work
 *
 * Omitted on a project means `compliant` — see `getLegalStatus()`.
 */
export type LegalStatus = 'compliant' | 'eaw_challenged' | 'eis_ordered' | 'court_paused';

export interface PublicRecord {
  title: string;
  url: string;
}

export interface EconomicAsymmetry {
  constructionJobsEstimate?: number;
  permanentOperationalJobsEstimate?: number;
  metricRatioText: string; // Documenting the High-CapEx / Low-Labor reality
}

export interface Project {
  name: string;
  description: string;
  coordinates: LatLngTuple;
  url: string;
  businessImpact: string;
  status: ProjectStatus;
  /** Environmental-review / litigation posture. Defaults to 'compliant' when absent. */
  legalStatus?: LegalStatus;
  /** One line on *what* the review or suit is, shown on the legal-hold badge. */
  legalNote?: string;
  // Enhanced public accountability metrics
  developer?: string; // Developer / operating company behind the project, where publicly known
  /**
   * `UtilityMeta.id` of the electric utility that serves this site — the
   * co-op, municipal, or investor-owned system whose ratepayers absorb the
   * grid work this facility triggers. Drives the ratepayer-impact widget.
   *
   * Set ONLY where a public record names the serving utility. Minnesota
   * service territory does not follow city limits, so inferring it from the
   * address would attribute a project to a co-op with no connection to it.
   * Absent means "not sourced yet" and renders as an explicit gap with a
   * link to report it — see the sourcing rule in ~/data/utilities.ts.
   */
  servingUtilityId?: string;
  estimatedCost?: string;
  powerCapacityMW?: string;
  waterFootprint?: string;
  publicRecord?: PublicRecord;
  economicAsymmetry?: EconomicAsymmetry; // Structured high-cap/low-labor accountability data
}

export const clientProjects: Project[] = [
  // ==========================================
  // ACTIVE / OPERATIONAL SITES (12 TOTAL)
  // ==========================================
{
    name: "Downtown Minneapolis Data Center (MSP4)",
    developer: "DataBank",
    description: "The primary carrier-hotel and network interconnection hub for the Upper Midwest, hosting the Midwest Internet Cooperative Exchange (MICE) and over 75 unique network providers.",
    coordinates: [44.971814446268695, -93.25470914945399],
    url: "https://www.databank.com/data-centers/minneapolis/511-11th-avenue/",
    businessImpact: "🟢 <strong>Operational</strong> | Core regional meet-me routing framework anchoring Upper Midwest telecom infrastructure. Fully multi-tenant.",
    status: "active",
    estimatedCost: "Multi-Tenant Aggregate Investment",
    powerCapacityMW: "~10-15 MW Aggregate Envelope",
    waterFootprint: "N+1 Chilled water arrays supported by localized redundant onsite well backups.",
    publicRecord: {
      title: "MICE Peering and Interconnection Infrastructure Portal",
      url: "https://www.micemn.net/"
    }
  },
{
    name: "East Twin Cities Data Center (MSP2)",
    developer: "DataBank",
    description: "Purpose-built multi-tenant colocation facility and Tier III carrier-hotel leveraging Eagan's open-access wholesale fiber rings.",
    coordinates: [44.83859577221845, -93.1457908457609],
    url: "https://www.databank.com/data-centers/minneapolis/eagan/",
    businessImpact: "🟢 <strong>Operational</strong> | Uptime Institute Tier III certified footprint supporting 20+ on-site carriers and direct cloud routing nodes.",
    status: "active",
    estimatedCost: "90,000 Sq. Ft. Facility Investment",
    powerCapacityMW: "20 MW (5 MW Critical IT Load)",
    waterFootprint: "Multi-stage air and water economizers providing environmental free-cooling 9 months of the year.",
    publicRecord: {
      title: "DataBank MSP2 Eagan Hub Portal",
      url: "https://www.databank.com/data-centers/minneapolis/eagan/"
    }
  },
  {
    name: "Shakopee Enterprise Data Center",
    description: "Hyperscale computing facility supporting commercial financial transaction backups.",
    coordinates: [44.7812, -93.5230],
    url: "https://www.shakopeemn.gov/",
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
    url: "https://www.bloomingtonmn.gov/",
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
    name: "Brooklyn Park Data Center (MSP3)",
    description: "Co-location operational space utilized for multi-county civil information hosting.",
    coordinates: [45.143925989932136, -93.38717940354411],
    url: "https://www.hennepin.us/",
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
    url: "https://www.woodburymn.gov/",
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
    url: "https://www.stlouiscountymn.gov/",
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
    url: "https://www.ci.stcloud.mn.us/",
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
    url: "https://www.olmstedcounty.gov/",
    businessImpact: "🟢 <strong>Operational</strong> | Zero-downtime redundant battery topologies active.",
    status: "active",
    estimatedCost: "$210 Million",
    powerCapacityMW: "50 MW",
    waterFootprint: "Chilled water loop with safety containment",
    publicRecord: {
      title: "Olmsted County Public Health Environmental Review",
      url: "https://www.olmstedcounty.gov/"
    }
  },
  {
    name: "Plymouth Technology Vault",
    description: "Active corporate disaster-recovery framework server array handling secure commerce files.",
    coordinates: [45.0105, -93.4552],
    url: "https://www.plymouthmn.gov/",
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
    url: "https://www.blueearthcountymn.gov/",
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

  // ==========================================
  // SITES UNDER CONSTRUCTION
  // ==========================================
{
    name: "Oppidan Eagan Data Center",
    description: "Single-story, build-to-suit edge data center located south of the Eagan YMCA, optimized for regional enterprise logistics.",
    coordinates: [44.82613684076696, -93.10676078822209],
    url: "https://cityofeagan.com/eagan-business-news-q3-2025",
    businessImpact: "🟠 <strong>Under Construction</strong> | Core building shell erected; interior infrastructure fit-out underway for October 2026 launch.",
    status: "construction",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "5 MW",
    waterFootprint: "Standard cooling configuration (61,554 sq ft facility)",
    publicRecord: {
      title: "City of Eagan Business News & Development Updates",
      url: "https://cityofeagan.com/eagan-business-news-q3-2025"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 0,
      permanentOperationalJobsEstimate: 0,
      metricRatioText: "Data not provided in local public record."
    }
  },
  {
    name: "Meta Rosemount Campus",
    developer: "Meta",
    description: "A 715,000 sq. ft. hyper-scale facility built explicitly for next-generation generative AI infrastructure footprints.",
    coordinates: [44.7303, -93.0185],
    url: "https://datacenters.atmeta.com/wp-content/uploads/2025/02/Metas-Rosemount-Data-Center.pdf",
    businessImpact: "🟠 <strong>Under Construction</strong> | 308 MW AI optimization workloads backed by 100% renewable energy.",
    status: "construction",
    estimatedCost: "$800+ Million",
    powerCapacityMW: "308 MW",
    waterFootprint: "Closed-loop system configuration minimizing active regional aquifer discharge.",
    publicRecord: {
      title: "Meta Global Infrastructure Announcements",
      url: "https://datacenters.atmeta.com/"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 1000,
      permanentOperationalJobsEstimate: 100,
      metricRatioText: "High CapEx / Low Labor: Massive $800M+ compute asset managed by roughly 100 permanent local staff."
    }
  },
  // ==========================================
  // PLANNED / ONGOING / PIPELINE (15 TOTAL)
  // ==========================================
  {
    name: "Monticello Tech Park",
    developer: "Frattalone Companies / Microsoft (Azure)",
    description: "Proposed $5 billion, 3-million sq. ft. massive campus spanning six separate data halls designed for Azure cloud ecosystems.",
    coordinates: [45.2755, -93.7912],
    url: "https://monticellodatacenterjobs.com/monticello-mn-data-center-construction-timeline/",
    businessImpact: "🟢 <strong>Rezoning Approved</strong> | 400+ MW ultimate site load footprint layout unanimously greenlit by City Council.",
    status: "planned",
    legalStatus: "eaw_challenged",
    legalNote: "Rezoning cleared, but the liquid-to-chip cooling footprint is still working through EAW processing.",
    estimatedCost: "$5.0 Billion",
    powerCapacityMW: "400 MW",
    waterFootprint: "Liquid-to-chip integrated systems pending Environmental Assessment Worksheet (EAW) processing.",
    publicRecord: {
      title: "City of Monticello Comprehensive Plan Rezoning Map",
      url: "https://monticellomn.gov/"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 1600,
      permanentOperationalJobsEstimate: 150,
      metricRatioText: "High CapEx / Low Labor: Historically unprecedented capital outlay generating fewer than 150 permanent full-time technical jobs."
    }
  },
  {
    name: "Scannell Technology Park",
    developer: "Scannell Properties",
    description: "Planned 1.3-million-square-foot data center footprint layout seeking capacity output across a 106-acre technology park parcel.",
    coordinates: [45.2891, -93.8184],
    url: "https://monticellodatacenterjobs.com/monticello-mn-data-center-construction-timeline/",
    businessImpact: "🟢 <strong>Comp Plan Amended</strong> | Parcel acquisition closed on the former nuclear generating site.",
    status: "planned",
    estimatedCost: "$900 Million",
    powerCapacityMW: "150 MW",
    waterFootprint: "Closed-loop chilled water distribution lines tracking phase allocations.",
    publicRecord: {
      title: "Monticello Economic Development Authority Filings",
      url: "https://monticellomn.gov/"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 500,
      permanentOperationalJobsEstimate: 40,
      metricRatioText: "High CapEx / Low Labor: Sprawling multi-million square foot industrial real estate cluster operating with minimal facility oversight."
    }
  },
  {
    name: "Cannon Falls Technology Park",
    developer: "Tract",
    description: "A master-planned data center campus on ~253 acres north of Cannon Falls led by developer Tract.",
    coordinates: [44.5264, -92.9341],
    url: "https://www.cannonfallstechnologypark.com/",
    businessImpact: "🟢 <strong>Development Compact Finalized</strong> | Pre-planned infrastructure designed for wholesale hyperscale deployment.",
    status: "planned",
    estimatedCost: "$1.5 Billion",
    powerCapacityMW: "708 MW",
    waterFootprint: "Liquid-to-chip high-density configurations utilizing municipal water/wastewater supplies.",
    publicRecord: {
      title: "Cannon Falls Community Planning Portal",
      url: "https://www.cannonfallstechnologypark.com/"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 1500,
      permanentOperationalJobsEstimate: 250,
      metricRatioText: "High CapEx / Low Labor: Master-planned infrastructure for absolute machine density where humans are restricted to facilities security and perimeter monitoring."
    }
  },
  {
    name: "Hermantown: Project Loon (Google)",
    developer: "Google",
    description: "A planned hyperscale campus complex chosen due to the region's energy-efficient climate and resilient power grid.",
    coordinates: [46.8042, -92.2858],
    url: "https://hermantownmn.com/community/community-highlights/google-announces-plans-for-hermantown-data-center/",
    businessImpact: "🟡 <strong>Environmental Review Testing</strong> | Faced intense local citizen organization pushback over transparency, NDAs, and grid load.",
    status: "planned",
    legalStatus: "eaw_challenged",
    legalNote: "Environmental review contested by organized local opposition over transparency, NDAs, and grid load.",
    estimatedCost: "$2.0 Billion",
    powerCapacityMW: "180 MW",
    waterFootprint: "Isolated closed-loop chilled water loops designed to insulate local northern water tables.",
    publicRecord: {
      title: "City of Hermantown Project Announcements",
      url: "https://hermantownmn.com/"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 900,
      permanentOperationalJobsEstimate: 50,
      metricRatioText: "High CapEx / Low Labor: Multibillion-dollar compute center relying almost exclusively on remote automation software."
    }
  },
  {
    name: "Elk River Data Center (IronGate)",
    developer: "IronGate",
    // Sourced: the planning-commission record has the site taking service from
    // the city's municipal utility under a custom industrial rate — which is
    // why the rate decision and the permit decision sit with the same council.
    servingUtilityId: "elk-river-municipal",
    description: "Proposed 60,000 sq. ft., 33 MW mid-scale facility generating local energy traction.",
    coordinates: [45.3288, -93.5704],
    url: "https://elkriverdatacenter.com/research-analysis/meetings/2026-06-23-planning-commission/", // Fact-Checked
    businessImpact: "🟢 <strong>Public Hearings Active</strong> | Integrates into municipal energy infrastructure framework under custom industrial rates.",
    status: "planned",
    estimatedCost: "$120 Million",
    powerCapacityMW: "33 MW",
    waterFootprint: "Closed-loop system designs deployed to mitigate municipal system stress.",
    publicRecord: {
      title: "Elk River City Council Public Hearing Agenda",
      url: "https://elkrivermn.portal.civicclerk.com/event/534/overview" // Fact-Checked
    },
    economicAsymmetry: {
      constructionJobsEstimate: 100,
      permanentOperationalJobsEstimate: 20,
      metricRatioText: "High CapEx / Low Labor: Regional server node housing major structural arrays while employing a skeletal maintenance staff of 20."
    }
  },
    {
    name: "Unisys Eagan Data Center",
    developer: "Unisys (facility since sold; new owner not confirmed)",
    description: "Enterprise data corridor footprint servicing legacy cloud infrastructure and high-volume redundancy architectures.",
    coordinates: [44.8392, -93.1341], // True Central Commons / Pilot Knob industrial corridor
    url: "https://www.datacenterdynamics.com/en/news/unisys-sells-data-center-outside-minneapolis-minnesota/",
    businessImpact: "🔴 <strong>Operational, development paused</strong> | Secure network infrastructure backup pipelines active.",
    status: "active",
    estimatedCost: "$120 Million",
    powerCapacityMW: "12 MW",
    waterFootprint: "Evaporative fallback (Low intensity)",
    publicRecord: {
      title: "City of Eagan Planning & Zoning Record",
      url: "https://cityofeagan.com/"
    }
  },
  {
    name: "Pine Island: Project Skyway (Google)",
    developer: "Google (in partnership with Xcel Energy)",
    // Sourced: the project is a stated Google/Xcel partnership, per the
    // community portal linked in `publicRecord` below.
    servingUtilityId: "xcel-mn",
    description: "A 400+ acre regional infrastructure technology campus in partnership with Google and Xcel Energy.",
    coordinates: [44.2215, -92.6410],
    url: "https://pineislandskyway.com/",
    businessImpact: "🔴 <strong>Legal Restraining Order</strong> | Halted by Goodhue County District Court on May 26, 2026, pending environmental assessment adequacy.",
    status: "paused",
    legalStatus: "court_paused",
    legalNote: "Goodhue County District Court restraining order (May 26, 2026) pending a ruling on environmental assessment adequacy.",
    estimatedCost: "$1.0 Billion",
    powerCapacityMW: "1,900 MW",
    waterFootprint: "Designed to connect to municipal systems using zero operational water via advanced air-cooling variant configurations.",
    publicRecord: {
      title: "Project Skyway Community Portal",
      url: "https://pineislandskyway.com/"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 800,
      permanentOperationalJobsEstimate: 100,
      metricRatioText: "Extreme Asymmetry: Supports massive clean energy grid investments yet runs with roughly 100 permanent local staff for the initial footprint."
    }
  },
  {
    name: "Faribault Industrial Campus (Archer)",
    developer: "Archer Datacenters",
    description: "Planned 500,000 sq. ft. industrial multi-tenant colocation campus footprint spanning over ~84 acres.",
    coordinates: [44.3218, -93.2562],
    url: "https://www.faribaultmn.gov/815/Archer-Datacenters",
    businessImpact: "🔴 <strong>Court Action Pause</strong> | Faribault City Council directed a supplemental EAW extension to March 31, 2027, following a Court of Appeals ruling.",
    status: "paused",
    legalStatus: "court_paused",
    legalNote: "Court of Appeals ruling forced a supplemental EAW; review window extended to March 31, 2027.",
    estimatedCost: "$350 Million",
    powerCapacityMW: "120 MW",
    waterFootprint: "Supplemental review tracking detailed project-specific water consumption metrics.",
    publicRecord: {
      title: "City of Faribault Archer Datacenters Review Hub",
      url: "https://www.faribaultmn.gov/815/Archer-Datacenters"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 400,
      permanentOperationalJobsEstimate: 25,
      metricRatioText: "High CapEx / Low Labor: Built for wholesale server tenancy where corporate clients manage server loads remotely."
    }
  },
  {
    name: "Inver Grove Heights Data Hub (QLevr)",
    developer: "QLevr",
    description: "Proposed 54,000-square-foot data facility on Carmen Avenue East proposed by Florida developer QLevr.",
    coordinates: [44.8481, -93.0425],
    url: "https://blandinonbroadband.org/2026/07/01/inver-grove-heights-city-council-approves-one-year-moratorium-on-data-centers-dakota-county/",
    businessImpact: "🔴 <strong>Development Paused</strong> | Stalled after City Council voted 3-2 to enact a one-year data center moratorium.",
    status: "paused",
    legalStatus: "eaw_challenged",
    legalNote: "Citizen petition filed for an Environmental Assessment Worksheet, alongside a one-year municipal moratorium.",
    estimatedCost: "$90 Million",
    powerCapacityMW: "5 MW",
    waterFootprint: "Subject to a citizen petition for an Environmental Assessment Worksheet (EAW).",
    publicRecord: {
      title: "Inver Grove Heights Moratorium Decrees",
      url: "https://www.ighmn.gov/"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 150,
      permanentOperationalJobsEstimate: 12,
      metricRatioText: "Localized Node: Minimal staffing required to service localized cloud caching and data replication sets."
    }
  },
  {
    name: "Chanhassen Proposed Cloud Core",
    description: "Pipeline enterprise application undergoing municipal zoning reviews for data-density approvals.",
    coordinates: [44.8618, -93.5322],
    url: "https://www.ci.chanhassen.mn.us/",
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
    url: "https://www.coonrapidsmn.gov/",
    businessImpact: "🔵 <strong>Planned Stage</strong> | Feasibility power parameters ongoing.",
    status: "planned",
    estimatedCost: "$70 Million",
    powerCapacityMW: "50 MW",
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
    url: "https://www.co.wright.mn.us/",
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
    url: "https://www.maplegrovemn.gov/",
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
    url: "https://www.burnsvillemn.gov/",
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
    url: "https://www.co.washington.mn.us/",
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
    name: "Amazon Web Services Becker Campus (Scraped)",
    developer: "Amazon Web Services (AWS)",
    description: "A proposed hyperscale computing campus on roughly 350 acres near the Sherco power plant. The project was tracking as active in scrapers until it was abruptly halted.",
    coordinates: [45.2266, -93.9594], // Coordinates for Becker, MN area
    url: "https://constructionreviewonline.com/who-loses-as-amazon-cancels-billion-dollar-data-center-project-in-becker-minnesota/",
    businessImpact: "❌ <strong>Officially Withdrawn</strong> | Canceled by AWS following regulatory disputes regarding backup diesel generator environmental reviews and state-level rollbacks on data center electricity sales tax exemptions.",
    status: "rejected",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "325 MW",
    waterFootprint: "Withdrawn before final utility footprints were established.",
    publicRecord: {
      title: "Sherburne County Board of Commissioners Zoning Archive",
      url: "https://www.co.sherburne.mn.us/"
    }
  },
  {
    name: "Nobles County Campus (Geronimo Power)",
    developer: "Geronimo Power",
    description: "A proposed 959-acre powered data park project in Summit Lake and Elk Township spearheaded by Geronimo Power.",
    coordinates: [43.6661, -95.9405],
    url: "https://geronimopower.com/in-development/nobles-county-powered-data-park/",
    businessImpact: "❌ <strong>Definitively Rejected</strong> | Denied by local authority actions to retain agricultural zones.",
    status: "rejected",
    estimatedCost: "$4.0 Billion",
    powerCapacityMW: "400 MW",
    waterFootprint: "Utilizes closed-loop cooling systems with isolated containment parameters.",
    publicRecord: {
      title: "Nobles County Powered Data Park Overview",
      url: "https://geronimopower.com/"
    }
  },
  {
    name: "North Mankato Tech Facility (Oppidan)",
    developer: "Oppidan Investment Company",
    description: "Early exploratory venture dropped entirely by Oppidan Investment following early environmental pushback actions.",
    coordinates: [44.1812, -94.0415],
    url: "https://www.northmankato.com/",
    businessImpact: "❌ <strong>Officially Withdrawn</strong> | Lawsuit voluntarily dismissed once developer scrubbed applications.",
    status: "rejected",
    estimatedCost: "$600 Million",
    powerCapacityMW: "110 MW",
    waterFootprint: "Voluntarily abandoned under citizen environmental scrutiny",
    publicRecord: {
      title: "North Mankato Voluntary Project Termination Records",
      url: "https://www.northmankato.com/"
    }
  },
  {
  "name": "Apple Valley Technology Park (Oppidan)",
  "developer": "Oppidan Investment Co.",
  "description": "In late March 2026, the Apple Valley City Council unanimously passed resolutions denying the preliminary plat, site plans, and conditional use permit for Oppidan Investment Co.'s proposed 300 MW, 1-million-square-foot data center campus on a 134-acre sand and gravel mining site at County Road 42 and Pilot Knob Road.",
  "coordinates": [44.7314, -93.1856],
  "url": "https://bringmethenews.com/minnesota-news/oppidans-plan-to-build-five-data-centers-in-apple-valley-is-rejected",
  "businessImpact": "❌ <strong>Definitively Rejected</strong> | The City Council formalized its denial following intense resident opposition regarding local utility impact, water pollution, and the developer's subsequent withdrawal of the necessary rezoning request.",
  "status": "rejected",
  "estimatedCost": "$750 Million",
  "powerCapacityMW": "300 MW",
  "waterFootprint": "Rejected before final utility allocation profiles could be formalized.",
  "publicRecord": {
    "title": "Apple Valley City Council Official Land Use Considerations",
    "url": "https://www.applevalleymn.gov/CivicAlerts.asp?AID=4164&ARC=6303"
  }
}
];