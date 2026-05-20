import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<img/>`);

export default function Main($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	const $$restProps = $.legacy_rest_props($$sanitized_props, []);
	var img = root();

	$.attribute_effect(img, () => ({ height: '100%', width: '100%', alt: '', ...$$restProps }));
	$.replay_events(img);
	$.append($$anchor, img);
}