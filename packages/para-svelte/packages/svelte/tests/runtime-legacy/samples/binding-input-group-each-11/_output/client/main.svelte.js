import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_3 = $.from_html(`<input type="radio"/>`);
var root_2 = $.from_html(`<div class="arg"></div>`);
var root_1 = $.from_html(`<div> <!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];

	let pipelineOperations = $.prop($$props, 'pipelineOperations', 28, () => [
		{ operation: { name: "foo", args: [] }, id: 1 },
		{
			operation: {
				name: "bar",
				args: [
					{
						name: "bar_1",
						value: "a",
						options: [{ value: "a" }, { value: "b" }]
					},

					{
						name: "bar_2",
						value: "c",
						options: [{ value: "c" }, { value: "d" }]
					}
				]
			},
			id: 2
		},

		{
			operation: {
				name: "baz",
				args: [
					{
						name: "baz_1",
						value: "b",
						options: [{ value: "a" }, { value: "b" }]
					},

					{
						name: "baz_2",
						value: "c",
						options: [{ value: "c" }, { value: "d" }]
					}
				]
			},
			id: 3
		}
	]);

	var $$exports = {
		get pipelineOperations() {
			return pipelineOperations();
		},

		set pipelineOperations($$value) {
			pipelineOperations($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, pipelineOperations, ({ operation, id }) => id, ($$anchor, $$item, $$index_2) => {
		let operation = () => $.get($$item).operation;
		let id = () => $.get($$item).id;
		var div = root_1();
		var text = $.child(div);
		var node_1 = $.sibling(text);

		$.each(node_1, 1, () => (operation(), $.untrack(() => operation().args)), $.index, ($$anchor, arg, $$index_1) => {
			var div_1 = root_2();

			$.each(div_1, 5, () => ($.get(arg), $.untrack(() => $.get(arg).options)), $.index, ($$anchor, $$item) => {
				let value = () => $.get($$item).value;
				var input = root_3();

				$.remove_input_defaults(input);

				var input_value;

				$.template_effect(() => {
					if (input_value !== (input_value = value())) {
						input.value = (input.__value = value()) ?? '';
					}
				});

				$.bind_group(
					binding_group,
					[$$index_1, $$index_2],
					input,
					() => {
						value();

						return $.get(arg).value;
					},
					($$value) => (
						$.get(arg).value = $$value,
						$.invalidate_inner_signals(() => (operation(), pipelineOperations()))
					)
				);

				$.append($$anchor, input);
			});

			$.reset(div_1);
			$.append($$anchor, div_1);
		});

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${id() ?? ''} `));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}