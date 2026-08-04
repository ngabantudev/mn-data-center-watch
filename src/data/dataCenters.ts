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
  /**
   * Citation to a specific facility page on an independent data-center
   * tracking site (cleanview.co or poweredbywho.com) that cross-referenced
   * and corroborates this record — used both to source facilities where no
   * news article or company page covers the specific figure (e.g. current
   * MW capacity) and to add facilities discovered via these trackers.
   *
   * Both sites publish a stable per-facility permalink; link that page
   * directly, never the state search/homepage. Treat as supplementary to
   * `publicRecord`/`url` where a stronger primary source exists, not a
   * replacement for one.
   */
  trackerSource?: PublicRecord;
  economicAsymmetry?: EconomicAsymmetry; // Structured high-cap/low-labor accountability data
}

export const clientProjects: Project[] = [
  // ==========================================
  // ACTIVE / OPERATIONAL SITES (14 TOTAL)
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
    powerCapacityMW: "2 MW (per cleanview.co; supersedes an earlier unsourced ~10-15 MW estimate)",
    waterFootprint: "N+1 Chilled water arrays supported by localized redundant onsite well backups.",
    publicRecord: {
      title: "MICE Peering and Interconnection Infrastructure Portal",
      url: "https://www.micemn.net/"
    },
    trackerSource: {
      title: "cleanview.co: Downtown Minneapolis Data Center MSP4",
      url: "https://cleanview.co/data-centers/minnesota/1304/downtown-minneapolis-data-cente-msp4"
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
    powerCapacityMW: "8 MW (per cleanview.co; supersedes an earlier unsourced 20 MW estimate)",
    waterFootprint: "Multi-stage air and water economizers providing environmental free-cooling 9 months of the year.",
    publicRecord: {
      title: "DataBank MSP2 Eagan Hub Portal",
      url: "https://www.databank.com/data-centers/minneapolis/eagan/"
    },
    trackerSource: {
      title: "cleanview.co: East Twin Cities Data Center MSP2",
      url: "https://cleanview.co/data-centers/minnesota/1217/east-twin-cities-data-cente-msp2"
    }
  },
  {
    name: "Centersquare MSP1 Shakopee Campus",
    developer: "Centersquare (formerly Compass Datacenters / Savvis / Evoque-Cyxtera)",
    description: "A colocation campus at 4450 Dean Lakes Boulevard, built by Compass Datacenters for Savvis (later CenturyLink) and opened in spring 2014; now operated under the Centersquare brand following Brookfield's 2024 merger of Evoque and Cyxtera.",
    coordinates: [44.7812, -93.5230],
    url: "https://www.startribune.com/data-center-to-locate-in-shakopee/225977621",
    businessImpact: "🟢 <strong>Operational</strong> | 100,000 sq. ft. initial building; master plan called for two additional buildings, ~$90 Million more, at full buildout.",
    status: "active",
    estimatedCost: "$26 Million (2013 initial build)",
    powerCapacityMW: "10 MW current (per cleanview.co/poweredbywho.com); 4.8 MW at 2014 opening",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Star Tribune: \"Data center to locate in Shakopee\"",
      url: "https://www.startribune.com/data-center-to-locate-in-shakopee/225977621"
    },
    trackerSource: {
      title: "cleanview.co: Centersquare MSP1",
      url: "https://cleanview.co/data-centers/minnesota/1162/centersquare-msp1"
    }
  },
  {
    name: "Verizon Bloomington Data Center",
    developer: "Verizon",
    description: "An existing Verizon data center at 10801 Bush Lake Road. The Bloomington City Council approved a 17,000 sq. ft. expansion of the facility (53,000 sq. ft. original building) on Jan. 25, 2021.",
    coordinates: [44.807, -93.375],
    url: "https://www.hometownsource.com/sun_current/community/bloomington/bloomington-city-council-approves-verizon-expansion-plan-adds-1-condition/article_3521cd1c-6662-11eb-85db-a3fc82537063.html",
    businessImpact: "🟢 <strong>Operational</strong> | Existing carrier facility, expanded 2021 following City Council approval (4-2 vote).",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Bloomington City Council: Verizon expansion approval (Jan. 25, 2021)",
      url: "https://www.hometownsource.com/sun_current/community/bloomington/bloomington-city-council-approves-verizon-expansion-plan-adds-1-condition/article_3521cd1c-6662-11eb-85db-a3fc82537063.html"
    }
  },
  {
    name: "Brooklyn Park Data Center (MSP3)",
    developer: "DataBank",
    description: "DataBank's MSP3 campus at 8111 Oxbow Creek Drive North, opened November 2021 as phase one of a 14-acre site; a 2023 expansion added colocation capacity.",
    coordinates: [45.143925989932136, -93.38717940354411],
    url: "https://www.databank.com/resources/press-releases/databank-announces-expansion-of-msp3-data-center-near-minneapolis/",
    businessImpact: "🟢 <strong>Operational</strong> | 2023 expansion added 4.5 MW / 15,000 sq. ft. raised-floor capacity.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "14 MW current (per cleanview.co); 1.5 MW initial IT load at 2021 opening",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "DataBank: MSP3 Expansion Press Release",
      url: "https://www.databank.com/resources/press-releases/databank-announces-expansion-of-msp3-data-center-near-minneapolis/"
    },
    trackerSource: {
      title: "cleanview.co: Brooklyn Park Data Center MSP3",
      url: "https://cleanview.co/data-centers/minnesota/1175/brooklyn-park-data-center-msp3"
    }
  },
  {
    name: "Ark Data Centers Duluth (Essentia Health)",
    developer: "Ark Data Centers (formerly Involta)",
    description: "A 26,000+ sq. ft. facility at 3401 Technology Drive, built as a greenfield site specifically to serve Essentia Health, a Duluth-headquartered regional medical system. Uses waterside economization for roughly 180 days/year of free cooling.",
    coordinates: [46.8275, -92.1303],
    url: "https://www.arkdna.com/resources/case-studies/essentia-health/",
    businessImpact: "🟢 <strong>Operational</strong> | Built to serve Essentia Health's regional medical-system infrastructure.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "1 MW",
    waterFootprint: "Waterside economization; ~180 days/year free cooling",
    publicRecord: {
      title: "Ark Data Centers: Duluth facility specifications",
      url: "https://www.arkdna.com/data-centers/minnesota/"
    }
  },
  {
    name: "Vaultas St. Cloud Data Center",
    developer: "Vaultas",
    description: "An existing colocation facility at 3701 18th St S. In March 2025 it received a $100,000 Grid Catalyst clean-energy grant to partner with Rochester-based LiquidCool Solutions on immersion cooling, targeting a 30-40% energy-use reduction.",
    coordinates: [45.5579, -94.1632],
    url: "https://www.stcloudlive.com/business/st-cloud-data-center-receives-100-000-for-new-partnership",
    businessImpact: "🟢 <strong>Operational</strong> | 2025 clean-energy grant funding an immersion-cooling retrofit.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "St. Cloud Live: \"St. Cloud data center receives $100,000 for new partnership\"",
      url: "https://www.stcloudlive.com/business/st-cloud-data-center-receives-100-000-for-new-partnership"
    }
  },
  {
    name: "Mayo Clinic / Epic Systems Data Center (Rochester)",
    developer: "Built by Mayo Clinic; owned and operated by Epic Systems since 2015",
    description: "A 62,000-77,000 sq. ft. facility at 4710 West Circle Drive, built by Mayo Clinic in 2012 to serve its Rochester, Jacksonville, and Scottsdale campuses. Sold to Epic Systems in a Dec. 2015 sale-leaseback; Epic now owns and operates it, hosting Mayo's Epic EHR data.",
    coordinates: [44.0234, -92.4629],
    url: "https://www.postbulletin.com/business/epic-buys-mayo-data-center",
    businessImpact: "🟢 <strong>Operational</strong> | Built for $33.7M (2012); sold to Epic Systems for $46M (2015); further substation/mechanical upgrades in 2017 and 2020.",
    status: "active",
    estimatedCost: "$33.7 Million (2012 build)",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Post Bulletin: \"Epic buys Mayo data center\"",
      url: "https://www.postbulletin.com/business/epic-buys-mayo-data-center"
    }
  },
  {
    name: "DataBank MSP1 (Edina)",
    developer: "DataBank",
    description: "DataBank's West Twin Cities facility at 7700 France Avenue South, in Edina's Technology Business District — the fourth DataBank-branded MSP site in the Twin Cities alongside MSP2 (Eagan), MSP3 (Brooklyn Park), and MSP4 (Downtown Minneapolis).",
    coordinates: [44.8897, -93.3499],
    url: "https://www.databank.com/data-centers/minneapolis/edina/",
    businessImpact: "🟢 <strong>Operational</strong> | 26,240 sq. ft. raised-floor colocation space; HIPAA/PCI DSS/SOC 1/SOC 2 certified.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "1.35 MW",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "DataBank: MSP1 Edina Facility Page",
      url: "https://www.databank.com/data-centers/minneapolis/edina/"
    },
    trackerSource: {
      title: "poweredbywho.com: DataBank MSP1 Edina",
      url: "https://poweredbywho.com/projects/databank-msp1-edina-82056a90"
    }
  },
  {
    name: "EdgeConneX MSP01 (Eden Prairie)",
    developer: "EdgeConneX",
    description: "A purpose-built edge colocation facility at 6875 Shady Oak Road, designed for low-latency local-market content and application delivery.",
    coordinates: [44.8547, -93.4708],
    url: "https://www.edgeconnex.com/locations/americas/minneapolis-mn/",
    businessImpact: "🟢 <strong>Operational</strong> | 32,738 sq. ft. (14,935 sq. ft. raised floor); HIPAA/ISO 27001/PCI DSS/SOC 2 certified.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "1.35 MW N+1, scalable to 2.85 MW",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "EdgeConneX: Minneapolis (MSP01) Facility Page",
      url: "https://www.edgeconnex.com/locations/americas/minneapolis-mn/"
    },
    trackerSource: {
      title: "poweredbywho.com: EdgeConneX Eden Prairie (MSP01)",
      url: "https://poweredbywho.com/projects/edgeconnex-eden-prairie-msp01-d7a3478f"
    }
  },
  {
    name: "Flexential Chaska Data Center",
    developer: "Flexential",
    description: "A colocation facility at 3500 Lyman Boulevard with 70,000 sq. ft. of raised-floor space, part of the Chaska data-center cluster alongside Stream and LightEdge facilities on the adjacent West Creek Lane campus.",
    coordinates: [44.7894, -93.6019],
    url: "https://www.flexential.com/data-centers/mn/minneapolis/chaska-data-center",
    businessImpact: "🟢 <strong>Operational</strong> | 160,838 sq. ft. total (70,000 sq. ft. raised floor); power density over 1,500 watts/sq. ft.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "9 MW",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Flexential: Chaska Data Center Facility Page",
      url: "https://www.flexential.com/data-centers/mn/minneapolis/chaska-data-center"
    },
    trackerSource: {
      title: "poweredbywho.com: Flexential Chaska Data Center",
      url: "https://poweredbywho.com/projects/flexential-chaska-data-center-a8bdc9f6"
    }
  },
  {
    name: "Stream Data Centers Minneapolis II (Chaska)",
    developer: "Stream Data Centers",
    description: "A build-to-suit facility at 1706 West Creek Lane, built for a major commercial bank and now fully leased. Sits on the same Chaska campus as Stream's original \"Minneapolis I\" building (1708 West Creek Lane), which Stream sold to LightEdge in January 2024 — see the separate LightEdge Minneapolis I entry.",
    coordinates: [44.7894, -93.6019],
    url: "https://www.streamdatacenters.com/locations/minneapolis/",
    businessImpact: "🟢 <strong>Operational</strong> | 56,000 sq. ft.; fully leased since completion in December 2017.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "2.4 MW critical load, expandable by an additional 2.4 MW",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Stream Data Centers: Minneapolis Location Page",
      url: "https://www.streamdatacenters.com/locations/minneapolis/"
    },
    trackerSource: {
      title: "poweredbywho.com: Stream Data Centers Minneapolis II",
      url: "https://poweredbywho.com/projects/stream-data-centers-minneapolis-ii-2c5dcf34"
    }
  },
  {
    name: "LightEdge Minneapolis I (Chaska)",
    developer: "LightEdge (purchased from Stream Data Centers, January 2024)",
    description: "A turnkey colocation facility at 1708 West Creek Lane, originally built by Stream Data Centers in 2014 as \"Minneapolis I\" (75,800 sq. ft., 7.2 MW at full capacity) and sold to LightEdge in January 2024.",
    coordinates: [44.7894, -93.6019],
    url: "https://lightedge.com/data-centers/minneapolis-data-center/",
    businessImpact: "🟢 <strong>Operational</strong> | Originally built 2014; under LightEdge ownership since Jan. 2024.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "3.6 MW currently deployed (75,800 sq. ft. shell built for 7.2 MW at full capacity)",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "LightEdge: Minneapolis Data Center Facility Page",
      url: "https://lightedge.com/data-centers/minneapolis-data-center/"
    },
    trackerSource: {
      title: "poweredbywho.com: LightEdge Chaska Data Center",
      url: "https://poweredbywho.com/projects/lightedge-chaska-data-center-8002c1f8"
    }
  },
  {
    name: "US Internet Data Center (Minnetonka)",
    developer: "US Internet (acquired by Metronet, Sept. 2025)",
    description: "A 20,000 sq. ft. colocation facility at 12450 Wayzata Boulevard, operated since 1995 by US Internet, a Minnesota-based fiber and hosting provider acquired by Metronet in September 2025. cleanview.co's record for this facility is labeled \"Planned,\" which appears to be a data-quality error — every other available source describes it as a long-operating facility, not a proposal.",
    coordinates: [44.975, -93.464],
    url: "https://www.datacenters.com/us-internet-usi-us-internet-minnetonka-facility",
    businessImpact: "🟢 <strong>Operational</strong> | Colocation, dedicated servers, and disaster-recovery services since 1995.",
    status: "active",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "datacenters.com: US Internet Minnetonka Facility Listing",
      url: "https://www.datacenters.com/us-internet-usi-us-internet-minnetonka-facility"
    },
    trackerSource: {
      title: "cleanview.co: US Internet Minneapolis Data Center",
      url: "https://cleanview.co/data-centers/minnesota/2122/us-internet-minneapolis-data-center"
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
  {
    name: "Centra MSP1 (Eagan)",
    developer: "Centra",
    description: "A 150,000 sq. ft. carrier-neutral interconnection facility at 610 Opperman Drive, adaptively reusing part of the former Thomson Reuters headquarters campus (sold by Thomson Reuters to Ryan Companies for $41 million as part of a 180-acre mixed-use redevelopment).",
    coordinates: [44.812, -93.15],
    url: "https://www.datacenterdynamics.com/en/news/centra-breaks-ground-on-data-center-redevelopment-in-minneapolis-minnesota/",
    businessImpact: "🟠 <strong>Under Construction</strong> | Broke ground on the former Thomson Reuters site; targeting a late-summer 2026 opening. Green power sourced through Dakota Electric's renewable programs.",
    status: "construction",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "12 MW",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Data Center Dynamics: \"Centra breaks ground on data center redevelopment in Minneapolis, Minnesota\"",
      url: "https://www.datacenterdynamics.com/en/news/centra-breaks-ground-on-data-center-redevelopment-in-minneapolis-minnesota/"
    },
    trackerSource: {
      title: "cleanview.co: MSP1 Data Center (Centra)",
      url: "https://cleanview.co/data-centers/minnesota/1884/msp1-data-center"
    }
  },
  // ==========================================
  // PLANNED / ONGOING / PIPELINE (13 TOTAL)
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
    name: "Microsoft Becker Campus",
    developer: "Microsoft",
    description: "Microsoft purchased roughly 300 acres in Becker, Sherburne County -- the same Sherco-power-plant-adjacent land Xcel Energy had held for a since-withdrawn Google project (see the historical Google Becker Data Center entry). No formal application has been submitted to the city.",
    coordinates: [45.3936, -93.8769],
    url: "https://www.startribune.com/microsoft-building-data-center-in-becker-xcel-stress-on-grids/600344079",
    businessImpact: "🔵 <strong>Announced</strong> | Land acquired; no formal plans or permit application submitted to the city yet.",
    status: "planned",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "325 MW",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Star Tribune: \"Xcel sells Becker land to Microsoft for data center, as it predicts major rise in energy demands\"",
      url: "https://www.startribune.com/microsoft-building-data-center-in-becker-xcel-stress-on-grids/600344079"
    },
    trackerSource: {
      title: "poweredbywho.com: Microsoft Becker Campus",
      url: "https://poweredbywho.com/projects/microsoft-becker-campus-ca6a740c"
    }
  },
  {
    name: "Farmington Technology Park (Tract)",
    developer: "Tract",
    description: "A proposed $5 billion, 343-acre campus (including the former Fountain Valley Golf Club property) planned for up to 12 data center buildings totaling more than 2.5 million sq. ft. The Farmington City Council approved the final plat and planned unit development on Nov. 18, 2024, but residents filed suit days later and won an injunction pausing the city's negotiations with Tract.",
    coordinates: [44.6402, -93.1466],
    url: "https://www.farmingtonmn.gov/473/Data-Center-Farmington-Technology-Park",
    businessImpact: "🔴 <strong>Court Action Pause</strong> | Council approval (Nov. 18, 2024) followed by a resident-filed injunction (Nov. 29, 2024) pausing city-developer negotiations.",
    status: "paused",
    legalStatus: "court_paused",
    legalNote: "Resident lawsuit and injunction (filed Nov. 29, 2024) paused negotiations between the city and Tract following council's Nov. 18, 2024 approval.",
    estimatedCost: "$5.0 Billion",
    powerCapacityMW: "708 MW",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "City of Farmington: Data Center (Farmington Technology Park)",
      url: "https://www.farmingtonmn.gov/473/Data-Center-Farmington-Technology-Park"
    },
    trackerSource: {
      title: "poweredbywho.com: Tract Farmington Technology Park",
      url: "https://poweredbywho.com/projects/tract-farmington-technology-park-44fde02f"
    }
  },
  {
    name: "Connect Data Centers Hampton (Oppidan)",
    developer: "Oppidan Investment Company, under subsidiary \"Connect Data Centers\"",
    description: "A proposed data center campus in the small city of Hampton, Dakota County. Oppidan halted work here (alongside its separate North Mankato proposal -- see that entry) citing Minnesota's backup-generator permitting timeline.",
    coordinates: [44.6083, -93.0094],
    url: "https://www.startribune.com/developer-halts-two-minnesota-data-centers-over-permits-for-backup-generators/601507579",
    businessImpact: "🔴 <strong>Development Paused</strong> | Halted over backup-generator permitting delays, alongside the North Mankato proposal.",
    status: "paused",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Star Tribune: \"Developer halts two Minnesota data centers over permits for backup generators\"",
      url: "https://www.startribune.com/developer-halts-two-minnesota-data-centers-over-permits-for-backup-generators/601507579"
    },
    trackerSource: {
      title: "poweredbywho.com: Connect Data Centers Hampton",
      url: "https://poweredbywho.com/projects/connect-data-centers-hampton-68de7c48"
    }
  },
  {
    name: "Olam Lakeville",
    developer: "Olam Holdings 1, LLC",
    description: "A 152-acre site in Lakeville, Dakota County, studied under an AUAR for roughly 1.36 million sq. ft. of light-industrial/office development. MCEA sued the city and Olam on Aug. 5, 2025, alleging the AUAR failed to adequately study a data center use for the site; a Dakota County District Court judge granted summary judgment for the city and Olam on May 26, 2026, finding the environmental review adequate.",
    coordinates: [44.65, -93.24],
    url: "https://www.hometownsource.com/sun_thisweek/community/lakeville/court-rules-in-favor-of-city-of-lakeville-in-auar-lawsuit/article_d658dca3-b44c-4175-ae15-d81bbdd88aab.html",
    businessImpact: "🟡 <strong>Environmental Review Litigation Resolved</strong> | Court upheld the city's AUAR as adequate (May 26, 2026), rejecting MCEA's claim that a data center use was hidden from review.",
    status: "planned",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "hometownsource.com: \"Court rules in favor of city of Lakeville in AUAR lawsuit\"",
      url: "https://www.hometownsource.com/sun_thisweek/community/lakeville/court-rules-in-favor-of-city-of-lakeville-in-auar-lawsuit/article_d658dca3-b44c-4175-ae15-d81bbdd88aab.html"
    },
    trackerSource: {
      title: "poweredbywho.com: Olam Lakeville Data Center",
      url: "https://poweredbywho.com/projects/olam-lakeville-data-center-mcea-lawsuit-a850c93b"
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
    developer: "Oppidan Investment Company, under holding entity \"Project Deacon, LLC\"",
    description: "A proposed data center studied under the North Mankato Industrial AUAR (679 acres, Belgrade Township, city of North Mankato as Responsible Governmental Unit). Oppidan withdrew before filing a formal application, citing Minnesota's backup-generator permitting process; no cost or capacity figures were ever publicly disclosed. A separate MCEA lawsuit alleging the AUAR understated the project's scope was voluntarily dismissed in May 2026.",
    coordinates: [44.1812, -94.0415],
    url: "https://www.mankatofreepress.com/news/local_news/data-center-plans-stalled-in-north-mankato-after-developer-backs-out/article_d0617045-9eed-4633-a055-aed5b0405879.html",
    businessImpact: "❌ <strong>Officially Withdrawn</strong> | Developer withdrew before filing a formal application, citing generator-permitting delays.",
    status: "rejected",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "MN EQB: North Mankato Industrial AUAR",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/261366?siId=261366-PROJ0000000001"
    }
  },
  {
    name: "Apple Valley Technology Park (Oppidan)",
    developer: "Oppidan Investment Co.",
    description: "In late March 2026, the Apple Valley City Council unanimously passed resolutions denying the preliminary plat, site plans, and conditional use permit for Oppidan Investment Co.'s proposed 300 MW, 1-million-square-foot data center campus on a 134-acre sand and gravel mining site at County Road 42 and Pilot Knob Road.",
    coordinates: [44.7314, -93.1856],
    url: "https://bringmethenews.com/minnesota-news/oppidans-plan-to-build-five-data-centers-in-apple-valley-is-rejected",
    businessImpact: "❌ <strong>Definitively Rejected</strong> | The City Council formalized its denial following intense resident opposition regarding local utility impact, water pollution, and the developer's subsequent withdrawal of the necessary rezoning request.",
    status: "rejected",
    estimatedCost: "$750 Million",
    powerCapacityMW: "300 MW",
    waterFootprint: "Rejected before final utility allocation profiles could be formalized.",
    publicRecord: {
      title: "Apple Valley City Council Official Land Use Considerations",
      url: "https://www.applevalleymn.gov/CivicAlerts.asp?AID=4164&ARC=6303",
    },
  },
  {
    name: "Google Becker Data Center (2022, historical)",
    developer: "Google",
    description: "An earlier, separate Google data center proposal near the Sherco power plant in Becker -- unrelated to Google's current Hermantown campus. Google had been in talks with Xcel Energy to develop the $600 million site since 2017, then withdrew in December 2022. Xcel later sold the land to Microsoft (see the Microsoft Becker Campus entry).",
    coordinates: [45.39, -93.88],
    url: "https://www.datacenterknowledge.com/hyperscalers/google-pauses-600m-data-center-development-in-mn",
    businessImpact: "❌ <strong>Withdrawn (Dec. 2022)</strong> | Google cited slowing Google Cloud Platform demand; called it a pause rather than a permanent cancellation, but never returned to the site before Xcel sold the land to Microsoft.",
    status: "rejected",
    estimatedCost: "$600 Million",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Data Center Knowledge: \"Google Pauses $600M Data Center Development in MN\"",
      url: "https://www.datacenterknowledge.com/hyperscalers/google-pauses-600m-data-center-development-in-mn"
    },
    trackerSource: {
      title: "poweredbywho.com: Google Becker Data Center",
      url: "https://poweredbywho.com/projects/google-becker-data-center-93213231"
    }
  },
];