import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let user = $$props['user'];

	function isActive(user) {
		return user.active;
	}

	$$renderer.push(`<div${$.attr_class('', void 0, { 'active': isActive(user) })}></div>`);
	$.bind_props($$props, { user });
}