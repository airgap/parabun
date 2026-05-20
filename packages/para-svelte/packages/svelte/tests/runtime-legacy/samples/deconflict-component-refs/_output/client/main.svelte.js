import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<input/>`);
var root_1 = $.from_html(`<li><!></li>`);
var root = $.from_html(`<ul></ul>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let components = $.prop($$props, 'components', 12);
	let name = $.mutable_source();

	var $$exports = {
		get components() {
			return components();
		},

		set components($$value) {
			components($$value);
			$.flush();
		}
	};

	var ul = root();

	$.each(ul, 5, components, $.index, ($$anchor, component, $$index) => {
		var li = root_1();
		var node = $.child(li);

		{
			var consequent = ($$anchor) => {
				var input = root_2();

				$.remove_input_defaults(input);
				$.bind_this(input, ($$value) => $.set(name, $$value), () => $.get(name));

				$.bind_value(input, () => $.get(component).name, ($$value) => (
					$.get(component).name = $$value,
					$.invalidate_inner_signals(() => (components()))
				));

				$.append($$anchor, input);
			};

			var alternate = ($$anchor) => {
				var text = $.text();

				$.template_effect(() => $.set_text(text, ($.get(component), $.untrack(() => $.get(component).name))));
				$.append($$anchor, text);
			};

			$.if(node, ($$render) => {
				if (($.get(component), $.untrack(() => $.get(component).edit))) $$render(consequent); else $$render(alternate, -1);
			});
		}

		$.reset(li);
		$.append($$anchor, li);
	});

	$.reset(ul);
	$.append($$anchor, ul);

	return $.pop($$exports);
}