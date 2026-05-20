import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let styles = $.prop($$props, 'styles', 28, () => `color: red;`);

	var $$exports = {
		get styles() {
			return styles();
		},

		set styles($$value) {
			styles($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(() => {
		$.set_style(p, `opacity: 0.5; ${styles() ?? ''}`);
		$.set_text(text, styles());
	});

	$.append($$anchor, p);

	return $.pop($$exports);
}