import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let domain = $.prop($$props, 'domain', 28, () => [0, 10]);
	let range = $.prop($$props, 'range', 28, () => [0, 100]);
	let x = $.prop($$props, 'x', 12, 5);
	let scale = $.mutable_source();

	$.legacy_pre_effect(() => ($.deep_read_state(domain()), $.deep_read_state(range())), () => {
		$.set(scale, (num) => {
			const t = domain()[0] + (num - domain()[0]) / (domain()[1] - domain()[0]);

			return range()[0] + t * (range()[1] - range()[0]);
		});
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get domain() {
			return domain();
		},

		set domain($$value) {
			domain($$value);
			$.flush();
		},

		get range() {
			return range();
		},

		set range($$value) {
			range($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.get(scale),
			$.deep_read_state(x()),
			$.untrack(() => $.get(scale)(x()))
		)
	]);

	$.append($$anchor, p);

	return $.pop($$exports);
}