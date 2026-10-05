import type { SearchSelectionOption } from "./search-selection";
export const bankOptions: readonly SearchSelectionOption[] = [
  "Vietcombank", "MBBANK", "VPBank", "VietinBank", "Techcombank", "BIDV", "Agribank", "ACB", "HDBank", "SHB", "VIB", "MSB", "LPBank", "SeABank", "TPBank", "OCB", "VBSP", "NCB", "Sacombank", "Eximbank", "Nam A Bank", "SCB", "VDB", "Woori", "Vietbank", "Bac A Bank", "ABBANK", "UOB", "PVcomBank", "VietABank", "HSBC", "PBVN", "SCBVL", "PGBank", "BVBank", "Kienlongbank", "SHBVN", "ANZVL", "CIMB", "SAIGONBANK", "HLBVN", "IVB", "BAOVIET Bank", "VRB", "Co-opBank", "GPBank", "VCBNeo", "Vikki Bank", "MBV",
].map(name => ({ value: name, label: name }));
