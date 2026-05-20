import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span class="icon svelte-p6hspt"></span>`);

const $$css = {
	hash: 'svelte-p6hspt',
	code: '.icon.svelte-p6hspt::before {content:"\\ff";}'
};

export default function _unknown_($$anchor) {
	$.append_styles($$anchor, $$css);

	var span = root();

	$.append($$anchor, span);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, {}, [], [], { mode: 'open' }));