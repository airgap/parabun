import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-1x1ajbk">inner</h1>`);

const $$css = {
	hash: 'svelte-1x1ajbk',
	code: 'h1.svelte-1x1ajbk {color:blue;}'
};

export default function _unknown_($$anchor) {
	$.append_styles($$anchor, $$css);

	var h1 = root();

	$.append($$anchor, h1);
}