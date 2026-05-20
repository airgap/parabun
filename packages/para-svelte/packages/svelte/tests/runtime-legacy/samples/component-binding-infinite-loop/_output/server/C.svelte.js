import * as $ from 'svelte/internal/server';

export default function C($$renderer, $$props) {
	let currentIdentifier = $$props['currentIdentifier'];
	let identifier = $$props['identifier'];
	let isCurrentlySelected;

	function toggle() {
		currentIdentifier = isCurrentlySelected ? null : identifier;
	}

	$: isCurrentlySelected = currentIdentifier === identifier;

	$$renderer.push(`<span${$.attr_class(isCurrentlySelected ? 'selected' : null)}><!--[-->`);
	$.slot($$renderer, $$props, 'default', {}, null);
	$$renderer.push(`<!--]--></span>`);
	$.bind_props($$props, { currentIdentifier, identifier });
}