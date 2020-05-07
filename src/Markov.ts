export class MarkovRule {
    public isTerminating: boolean;
    public left: string;
    public right: string;

    private static TERMINATING_RULE = /^([^:]*)::([^:]*)$/;
    private static NONTERMINATING_RULE = /^([^:]*):([^:]*)$/;

    public constructor(isTerminating: boolean, left: string, right: string) {
        this.isTerminating = isTerminating;
        this.left = left;
        this.right = right;
    }

    public static parse(line: string): MarkovRule | null {
        if (line.indexOf(':') === -1) {
            return null;
        }

        let match;

        if ((match = line.match(MarkovRule.TERMINATING_RULE)) != null) {
            let [, left, right] = match;
            return new MarkovRule(true, left, right);
        } else if ((match = line.match(MarkovRule.NONTERMINATING_RULE)) != null) {
            let [, left, right] = match;
            return new MarkovRule(false, left, right);
        } else {
            throw new Error("Syntax error in line " + line);
        }
    }

    public apply(state: string): [boolean, string] {
        if (this.left === "") {
            return [true, this.right + state];
        } else if (state.indexOf(this.left) !== -1) {
            return [true, state.replace(this.left, this.right)];
        } else {
            return [false, state];
        }
    }
}

export class Markov {
    public rules: MarkovRule[];
    public initialState: string;
    public state: string;
    public terminated: boolean;

    public constructor(
        rules: MarkovRule[] = [],
        initialState: string = '',
        state: string = '',
        terminated: boolean = false
    ) {
        this.rules = rules;
        this.initialState = initialState;
        this.state = state;
        this.terminated = terminated;
    }

    public parseRules(lines: string[]): Markov {
        return new Markov(
            lines.map(MarkovRule.parse)
                .filter((rule) => rule !== null) as MarkovRule[],
            this.initialState,
            this.state,
            this.terminated,
        );
    }

    public setInitialState(initialState: string): Markov {
        return new Markov(
            this.rules,
            initialState,
            initialState,
            this.terminated,
        );
    }

    public reset(): Markov {
        return new Markov(
            this.rules,
            this.initialState,
            this.initialState,
            false
        );
    }

    public step(): [boolean, Markov] {
        if (this.terminated)
            return [false, this];

        for (const rule of this.rules) {
            const [applied, newState] = rule.apply(this.state);
            if (applied) {
                return [true, new Markov(
                    this.rules,
                    this.initialState,
                    newState,
                    rule.isTerminating,
                )];
            }
        }

        return [false, new Markov(
            this.rules,
            this.initialState,
            this.state,
            true,
        )];
    }
}