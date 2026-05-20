import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<li><label><input type="checkbox"/> </label></li>`);
var root_1 = $.from_html(`<h2> </h2> <ul></ul>`, 1);
var root = $.from_html(`<p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let keys = $.mutable_source(["foo", "bar"]);
	let values = $.mutable_source([1, 2, 3]);
	let object = $.mutable_source({});

	// Make sure Svelte has an array to bind to
	function update() {
		$.set(keys, ["qux"]);
		$.set(values, [4, 5, 6]);
	}

	$.legacy_pre_effect(() => ($.get(keys), $.get(object)), () => {
		$.get(keys).forEach((key) => {
			// Make sure Svelte has an array to bind to
			if (!$.get(object)[key]) {
				$.mutate(object, $.get(object)[key] = []);
			}
		});
	});

	$.legacy_pre_effect_reset();

	var $$exports = { update };
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var node = $.sibling(p, 2);

	$.each(node, 1, () => $.get(keys), (key) => key, ($$anchor, key, $$index_1) => {
		var fragment_1 = root_1();
		var h2 = $.first_child(fragment_1);
		var text_1 = $.child(h2, true);

		$.reset(h2);

		var ul = $.sibling(h2, 2);

		$.each(ul, 5, () => $.get(values), (value) => value, ($$anchor, value) => {
			var li = root_2();
			var label = $.child(li);
			var input = $.child(label);

			$.remove_input_defaults(input);

			var input_value;
			var text_2 = $.sibling(input);

			$.reset(label);
			$.reset(li);

			$.template_effect(() => {
				$.set_attribute(input, 'name', $.get(key));

				if (input_value !== (input_value = $.get(value))) {
					input.value = (input.__value = $.get(value)) ?? '';
				}

				$.set_text(text_2, ` ${$.get(value) ?? ''}`);
			});

			$.bind_group(
				binding_group,
				[$$index_1],
				input,
				() => {
					$.get(value);

					return $.get(object)[$.get(key)];
				},
				($$value) => $.mutate(object, $.get(object)[$.get(key)] = $$value)
			);

			$.append($$anchor, li);
		});

		$.reset(ul);
		$.template_effect(() => $.set_text(text_1, $.get(key)));
		$.append($$anchor, fragment_1);
	});

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.get(object),
			$.untrack(() => JSON.stringify($.get(object)))
		)
	]);

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'update', update);

	return $.pop($$exports);
}