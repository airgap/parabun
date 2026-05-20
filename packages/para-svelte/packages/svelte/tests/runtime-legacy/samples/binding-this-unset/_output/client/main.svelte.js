import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<canvas data-x="true"></canvas>`);
var root_2 = $.from_html(`<canvas data-x="false"></canvas>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var canvas = root_1();

			$.bind_this(canvas, ($$value) => foo($$value), () => foo());
			$.append($$anchor, canvas);
		};

		var alternate = ($$anchor) => {
			var canvas_1 = root_2();

			$.bind_this(canvas_1, ($$value) => foo($$value), () => foo());
			$.append($$anchor, canvas_1);
		};

		$.if(node, ($$render) => {
			if (x()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}