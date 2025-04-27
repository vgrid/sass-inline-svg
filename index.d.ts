import * as sass from 'sass-embedded';
export default function inliner(base: string, opts?: { encodingFormat?: 'base64' | 'uri', optimize?: boolean }): sass.CustomFunction<'async'>;