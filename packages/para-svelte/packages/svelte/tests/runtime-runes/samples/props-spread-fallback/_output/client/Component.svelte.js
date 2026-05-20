import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Component($$anchor, $$props) {
	const propB = $.prop($$props, 'propB', 3, "fallback");
	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${$$props.propA ?? ''} ${propB() ?? ''}`));
	$.append($$anchor, p);
}