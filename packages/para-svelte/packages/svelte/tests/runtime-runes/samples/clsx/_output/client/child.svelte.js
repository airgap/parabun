import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>child</div>`);

export default function Child($$anchor, $$props) {
	var div = root();

	$.template_effect(() => $.set_class(div, 1, $.clsx($$props.class)));
	$.append($$anchor, div);
}