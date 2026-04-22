/**
 * Vue 版本 <-> Node.js 版本对应配置（2 ~ 3最新）
 * @see https://cn.vuejs.org/guide/quick-start
 */
interface VueNodeVersion {
  vueVersion: number;
  supportedNodeRange: string; // 官方明确的支持范围
}

const VUE_NODE_VERSIONS: VueNodeVersion[] = [
  {
    vueVersion: 3,
    supportedNodeRange: '^20.19.0 || >=22.12.0',
  },
  {
    vueVersion: 2,
    supportedNodeRange: '>=8.9.0 <17.0.0',
  },
];

/** 根据 Vue 大版本获取推荐配置 */
function getRecommendedNodeByVue(vueVersion: number) {
  const config = VUE_NODE_VERSIONS.find(v => v.vueVersion === vueVersion);
  if (!config) throw new Error(`不支持的 Vue 版本: ${vueVersion}`);
  return config;
}
/** 获取 engines 配置（可直接用于 package.json） */
export function getEnginesByVue(vueVersion: number) {
  const { supportedNodeRange } = getRecommendedNodeByVue(vueVersion);
  return { node: supportedNodeRange };
}
