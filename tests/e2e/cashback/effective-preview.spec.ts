import { test, expect } from "@playwright/test";
import { expectedXu, rewardEstimate } from "../../../src/lib/wallet-preview";

test("preview keeps the effective link range after a coefficient is chosen", () => {
 const membership={tierCode:"bronze",minSharePercent:65,maxSharePercent:75,effectiveMinSharePercent:63,effectiveMaxSharePercent:71,previewAvailable:true,nextTier:{tierCode:"platinum",minSharePercent:75,maxSharePercent:85,effectiveMinSharePercent:73,effectiveMaxSharePercent:80,previewAvailable:true}};
 const product={schemaVerified:true,commission:10001};
 expect(rewardEstimate(product,membership).current).toEqual({min:6301,max:7101});
 expect(rewardEstimate(product,membership).next).toEqual({min:7301,max:8001});
 const snapshot={...membership,effectiveSharePercent:63,payoutFactor:"0.63"};
 expect(rewardEstimate(product,membership,snapshot).current).toEqual({min:6301,max:7101});
 expect(rewardEstimate({...product,commission:5001},membership,snapshot).current).toEqual({min:3151,max:3551});
 expect(rewardEstimate(product,membership,{...membership,sharePercent:63,payoutFactor:"0.63"}).current).toEqual({min:6301,max:7101});
 expect(rewardEstimate(product,{...membership,policyId:"new-policy",effectiveMinSharePercent:73,effectiveMaxSharePercent:80},snapshot).current).toEqual({min:6301,max:7101});
 expect(rewardEstimate(product,{...membership,previewAvailable:false}).current).toBeNull();
 expect(rewardEstimate({...product,schemaVerified:false},membership,snapshot).current).toBeNull();
 expect(expectedXu(10000,63,63)).toEqual({min:6300,max:6300});
 expect(expectedXu(0,63,63)).toEqual({min:0,max:0});
 expect(expectedXu(10001,0,0)).toEqual({min:0,max:0});
});
