import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<label><input type="radio" name="current"/> current</label>`);
var root_1 = $.from_html(`<div class="item"> <!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];

	let list = $.prop($$props, 'list', 28, () => [
		{ name: "a", text: "This is a test." },
		{ name: "b", text: "This is another test." },
		{ name: "c", text: "This is also a test." }
	]);

	let current = $.prop($$props, 'current', 12, "a");

	function moveUp(i) {
		list([
			...list().slice(0, Math.max(i - 1, 0)),
			list()[i],
			list()[i - 1],
			...list().slice(i + 1)
		]);
	}

	function moveDown(i) {
		moveUp(i + 1);
	}

	var $$exports = {
		moveUp,
		moveDown,
		get list() {
			return list();
		},

		set list($$value) {
			list($$value);
			$.flush();
		},

		get current() {
			return current();
		},

		set current($$value) {
			current($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, list, (item) => item.name, ($$anchor, item) => {
		var div = root_1();
		var text = $.child(div);
		var node_1 = $.sibling(text);

		{
			var consequent = ($$anchor) => {
				var label = root_2();
				var input = $.child(label);

				$.remove_input_defaults(input);

				var input_value;

				$.next();
				$.reset(label);

				$.template_effect(() => {
					if (input_value !== (input_value = ($.get(item), $.untrack(() => $.get(item).name)))) {
						input.value = (input.__value = ($.get(item), $.untrack(() => $.get(item).name))) ?? '';
					}
				});

				$.bind_group(
					binding_group,
					[],
					input,
					() => {
						($.get(item), $.untrack(() => $.get(item).name));

						return current();
					},
					current
				);

				$.append($$anchor, label);
			};

			$.if(node_1, ($$render) => {
				if (true) $$render(consequent);
			});
		}

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${($.get(item), $.untrack(() => $.get(item).name)) ?? ''} `));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'moveUp', moveUp);
	$.bind_prop($$props, 'moveDown', moveDown);

	return $.pop($$exports);
}