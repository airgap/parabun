import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 28, () => [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }]);
	let getName = $.prop($$props, 'getName', 12, (x) => x.name);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get getName() {
			return getName();
		},

		set getName($$value) {
			getName($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, a, $.index, ($$anchor, x, $$index) => {
		Widget($$anchor, {
			get value() {
				return $.get(x).name;
			},

			set value($$value) {
				(
					$.get(x).name = $$value,
					$.invalidate_inner_signals(() => (a()))
				);
			},
			$$legacy: true
		});
	});

	var p = $.sibling(node, 2);
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.deep_read_state(a()),
			$.deep_read_state(getName()),
			$.untrack(() => a().map(getName()).join(', '))
		)
	]);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}