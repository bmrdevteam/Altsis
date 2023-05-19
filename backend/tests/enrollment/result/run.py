import csv
import numpy as np
import matplotlib.pyplot as plt


def parseLog(file):
    f = open(file, "r")

    res = []
    sequence = {}
    response_code = {}
    response_time = {}
    response_sequence = {}

    for line in csv.reader(f):
        if line[1] == "http":
            if line[3] not in sequence:
                sequence[line[3]] = 1
                response_sequence[line[3]] = []
                response_sequence[line[3] + "(500)"] = []

            code = line[3]
            if line[4] == "500":
                code += "(500)"

            if code not in response_code.keys():
                response_code[code] = []
                response_time[code] = []
                response_sequence[code] = []
            response_code[code].append(line[4])
            response_time[code].append(float(line[5]))
            response_sequence[code].append(sequence[line[3]])
            sequence[line[3]] += 1

    for version in response_code.keys():
        res.append(
            {
                "version": version,
                "response_code": response_code[version],
                "response_time": response_time[version],
                "response_sequence": response_sequence[version],
            }
        )

    f.close()
    return res


color = {
    "v0": "lightgray",
    "v0(500)": "red",
    "v1": "orange",
    "v2": "green",
    "v3": "blue",
    "v4": "purple",
}

if __name__ == "__main__":
    test_result = parseLog("./log.csv")

    X = [i for i in range(1, 1001)]

    for test_item in test_result:
        X = test_item["response_sequence"]
        Y = test_item["response_time"]
        if "500" in test_item["version"]:
            plt.scatter(
                X,
                Y,
                label=test_result[0]["version"] + "(500)",
                c=color[test_item["version"]],
                s=1,
            )
        else:
            plt.plot(X, Y, label=test_item["version"], c=color[test_item["version"]])

            p95 = np.percentile(Y, 95)
            print(p95)

    plt.title("Performance Test")
    plt.xlabel("sequence")
    plt.xticks(range(0, 1000, 50))

    plt.ylabel("response time(ms)")
    plt.yticks(range(0, 20000, 2000))
    current_values = plt.gca().get_yticks()
    plt.gca().set_yticklabels(["{:,.0f}".format(x) for x in current_values])

    plt.legend(bbox_to_anchor=(1, 1))
    plt.savefig("./result.png")
    plt.show()

    plt.cla()  # clear the current axes
    plt.clf()  # clear the current figure
    plt.close()  # closes the current figure
