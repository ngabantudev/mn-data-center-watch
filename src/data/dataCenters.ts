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
   * Direct citation to this project's Minnesota Environmental Quality Board
   * review record (AUAR / EAW / EIS) — the state's system of record for
   * environmental-review status, distinct from `publicRecord` (which is
   * typically the developer's or city's own announcement/filing).
   *
   * Set ONLY when a specific EQB project-detail record has been matched to
   * this project by name, address, or study-area boundary — never guessed
   * from municipality alone. The EQB search tool (webapp.pca.state.mn.us/
   * eqb-search/projects) has no documented public API or stable search-page
   * deep links; the `url` here is the project's own detail-page permalink
   * (`.../project-detail/{aiId}?siId={siId}`), confirmed to resolve before
   * being added. Absent means no EQB record has been matched yet, not that
   * one doesn't exist.
   */
  eqbRecord?: PublicRecord;
  economicAsymmetry?: EconomicAsymmetry; // Structured high-cap/low-labor accountability data
}

export const clientProjects: Project[] = [
  // ==========================================
  // ACTIVE / OPERATIONAL SITES (8 TOTAL)
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
    name: "Centersquare MSP1 Shakopee Campus",
    developer: "Centersquare (formerly Compass Datacenters / Savvis / Evoque-Cyxtera)",
    description: "A colocation campus at 4450 Dean Lakes Boulevard, built by Compass Datacenters for Savvis (later CenturyLink) and opened in spring 2014; now operated under the Centersquare brand following Brookfield's 2024 merger of Evoque and Cyxtera.",
    coordinates: [44.7812, -93.5230],
    url: "https://www.startribune.com/data-center-to-locate-in-shakopee/225977621",
    businessImpact: "🟢 <strong>Operational</strong> | 100,000 sq. ft. initial building; master plan called for two additional buildings, ~$90 Million more, at full buildout.",
    status: "active",
    estimatedCost: "$26 Million (2013 initial build)",
    powerCapacityMW: "4.8 MW (initial IT load)",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "Star Tribune: \"Data center to locate in Shakopee\"",
      url: "https://www.startribune.com/data-center-to-locate-in-shakopee/225977621"
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
    powerCapacityMW: "1.5 MW initial IT load; ~9 MW planned at full 3-hall buildout",
    waterFootprint: "Not publicly disclosed",
    publicRecord: {
      title: "DataBank: MSP3 Expansion Press Release",
      url: "https://www.databank.com/resources/press-releases/databank-announces-expansion-of-msp3-data-center-near-minneapolis/"
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
    // Covers Meta's adjacent 2024 expansion-parcel acquisition, not the
    // original built campus -- news coverage of that purchase links this
    // exact EQB record.
    eqbRecord: {
      title: "MN EQB: Rosemount Industrial AUAR Update",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/255536?siId=255536-PROJ0000000002"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 1000,
      permanentOperationalJobsEstimate: 100,
      metricRatioText: "High CapEx / Low Labor: Massive $800M+ compute asset managed by roughly 100 permanent local staff."
    }
  },
  // ==========================================
  // PLANNED / ONGOING / PIPELINE (10 TOTAL)
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
    eqbRecord: {
      title: "MN EQB: Monticello Industrial AUAR",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/264408?siId=264408-PROJ0000000001"
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
    // Same study area as "Monticello Tech Park" above -- one AUAR covers
    // the whole Monticello Industrial district's parcels.
    eqbRecord: {
      title: "MN EQB: Monticello Industrial AUAR",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/264408?siId=264408-PROJ0000000001"
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
    eqbRecord: {
      title: "MN EQB: Cannon Falls Industrial AUAR",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/262244?siId=262244-PROJ0000000001"
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
    eqbRecord: {
      title: "MN EQB: Updated Hermantown Industrial AUAR",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/263202?siId=263202-PROJ0000000003"
    },
    economicAsymmetry: {
      constructionJobsEstimate: 900,
      permanentOperationalJobsEstimate: 50,
      metricRatioText: "High CapEx / Low Labor: Multibillion-dollar compute center relying almost exclusively on remote automation software."
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
    eqbRecord: {
      title: "MN EQB: Project Skyway",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/262379?siId=262379-PROJ0000000001"
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
    eqbRecord: {
      title: "MN EQB: Archer Datacenters Faribault Campus",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/263487?siId=263487-PROJ0000000001"
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
    name: "Legacy Investing Data Center (Star Tribune Heritage Plant)",
    developer: "Legacy Investing",
    description: "Legacy Investing (Arlington, VA) has signed a purchase agreement for the Star Tribune's shuttered 500,000+ sq. ft. North Loop printing plant, a 13-acre site at 800 N First St. Plans call for a 20 MW data center with possible mixed-use housing/retail components; sale expected to close Q4 2026.",
    coordinates: [44.99086, -93.27684],
    url: "https://www.startribune.com/data-center-developer-signs-deal-to-buy-minnesota-star-tribunes-shuttered-north-loop-printing-plant/601872895",
    businessImpact: "🟡 <strong>Purchase Agreement Signed</strong> | Sale of the former Star Tribune printing plant expected to close Q4 2026. Minneapolis's data-center development moratorium (in effect through November 2026) exempts facilities under 350,000 sq. ft.; this site is well above that threshold.",
    status: "planned",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "20 MW",
    waterFootprint: "Not publicly disclosed",
  },
  {
    name: "US Internet Data Center (Robbinsdale)",
    developer: "US Internet",
    description: "US Internet, a Minnetonka-based ISP, acquired the shuttered Robbinsdale Clinic site at 3819 W. Broadway — Minnesota's oldest abortion clinic, closed in February 2026 — and plans to demolish the building for a 4,000 sq. ft. data center. A separate, distinct facility from US Internet's existing Minnetonka data center.",
    coordinates: [45.02485, -93.3328],
    url: "https://www.datacenterdynamics.com/en/news/minnesota-abortion-clinic-site-set-to-be-turned-into-data-center-pro-life-memorial-held/",
    businessImpact: "🟡 <strong>Site Acquired, Demolition Pending</strong> | Former clinic building slated for demolition; no MW capacity or cost figures publicly disclosed yet.",
    status: "planned",
    estimatedCost: "Not publicly disclosed",
    powerCapacityMW: "Not publicly disclosed",
    waterFootprint: "Not publicly disclosed",
  },
  // ==========================================
  // REJECTED / WITHDRAWN SITES (5 TOTAL, HISTORICAL)
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
    },
    eqbRecord: {
      title: "MN EQB: Nobles County Data Center AUAR",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/266340?siId=266340-PROJ0000000002"
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
    // Address match (15255 Johnny Cake Ridge Rd) to the Rockport LLC
    // sand-and-gravel site; the AUAR itself doesn't name Oppidan directly.
    eqbRecord: {
      title: "MN EQB: Rockport LLC Redevelopment AUAR",
      url: "https://webapp.pca.state.mn.us/eqb-search/project-detail/96611?siId=96611-PROJ0000000004"
    },
  },
  {
    name: "Elk River Data Center (IronGate / Swervo)",
    developer: "Elk River Capital LLC / Swervo Development",
    // Sourced: the same municipal-utility custom-rate arrangement documented
    // while this was still an active proposal; kept for the historical record.
    servingUtilityId: "elk-river-municipal",
    description: "Proposed 33 MW data center inside a 60,000 sq. ft. former injection-molding warehouse. The Elk River City Council unanimously rejected the zoning amendment the project needed on July 6, 2026; the developer withdrew its application shortly after, and the council directed staff to draft a one-year moratorium on future data center proposals.",
    coordinates: [45.3288, -93.5704],
    url: "https://www.hometownsource.com/elk_river_star_news/elk_river_star_news/elk-river-data-center-developer-withdraws-application/article_f09155aa-2661-4fee-80c6-fc379cc6af73.html",
    businessImpact: "❌ <strong>Denied, Then Withdrawn</strong> | City Council rejected the required zoning amendment; the developer withdrew the application days later. The city is now drafting a one-year moratorium on future data center proposals.",
    status: "rejected",
    estimatedCost: "$120 Million",
    powerCapacityMW: "33 MW",
    waterFootprint: "Withdrawn before final utility footprint was established.",
    publicRecord: {
      title: "Elk River City Council Public Hearing Agenda",
      url: "https://elkrivermn.portal.civicclerk.com/event/534/overview"
    }
  },
];