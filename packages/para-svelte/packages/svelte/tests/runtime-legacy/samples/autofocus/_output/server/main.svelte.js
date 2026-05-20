import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let active = $.fallback($$props['active'], 'default');
	let autofocusFalse = $.fallback($$props['autofocusFalse'], false);
	let autofocusTrue = $.fallback($$props['autofocusTrue'], true);
	let spread = { autofocus: true };

	if (active === 'default') {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<input${$.attr('title', active)} autofocus=""/>`);
	} else if (active === 'dynamic-false') {
		$$renderer.push('<!--[1-->');
		$$renderer.push(`<input${$.attr('title', active)}${$.attr('autofocus', autofocusFalse, true)}/>`);
	} else if (active === 'dynamic-true') {
		$$renderer.push('<!--[2-->');
		$$renderer.push(`<input${$.attr('title', active)}${$.attr('autofocus', autofocusTrue, true)}/>`);
	} else if (active === 'spread') {
		$$renderer.push('<!--[3-->');
		$$renderer.push(`<input${$.attributes({ title: active, ...spread }, void 0, void 0, void 0, 4)}/>`);
	} else if (active === 'spread-override') {
		$$renderer.push('<!--[4-->');
		$$renderer.push(`<input${$.attributes({ title: active, ...spread, autofocus: false }, void 0, void 0, void 0, 4)}/>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { active, autofocusFalse, autofocusTrue });
}